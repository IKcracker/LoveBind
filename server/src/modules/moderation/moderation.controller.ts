import {
  BadRequestException, ConflictException, Controller, ForbiddenException,
  Get, NotFoundException, Param, Post, Body, Req, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { storage } from '../photos/photo.controller';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { reconcileAccount } from './activation';

function canModerate(userId: string): boolean {
  const allowed = process.env.LOVEBIND_MODERATOR_IDS;
  if (!allowed) return false;
  return allowed.split(',').map(id => id.trim()).filter(Boolean).includes(userId);
}

@Controller('moderation')
@UseGuards(AuthGuard)
export class ModerationController {
  constructor(private readonly prisma: PrismaService) {}

  private requireModerator(req: AuthenticatedRequest) {
    if (!canModerate(req.authUserId)) throw new ForbiddenException('Moderator access required');
  }

  @Get('access')
  access(@Req() req: AuthenticatedRequest) {
    return { canModerate: canModerate(req.authUserId) };
  }

  @Get('photos')
  async photos(@Req() req: AuthenticatedRequest) {
    this.requireModerator(req);
    const rows = await this.prisma.profile.findMany({
      where: { photoReviewStatus: 'PENDING', photoObjectKey: { not: null } },
      select: { userId: true, displayName: true, photoObjectKey: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' }, take: 30,
    });
    if (rows.length === 0) return { photos: [] };
    const { client, bucket } = storage();
    const photos = await Promise.all(rows.map(async item => ({
      userId: item.userId, displayName: item.displayName, submittedAt: item.updatedAt,
      photoUrl: await getSignedUrl(client, new GetObjectCommand({
        Bucket: bucket, Key: item.photoObjectKey!,
      }), { expiresIn: 120 }),
    })));
    return { photos };
  }

  @Post('photos/:userId/decision')
  async decide(@Req() req: AuthenticatedRequest, @Param('userId') userId: string, @Body() body: unknown) {
    this.requireModerator(req);
    if (req.authUserId === userId) throw new ForbiddenException('You cannot review your own photo');
    if (typeof userId !== 'string' || !/^[A-Za-z0-9_-]{10,100}$/.test(userId)) {
      throw new BadRequestException('Invalid account');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Decision required');
    }
    const data = body as Record<string, unknown>;
    if (data.decision !== 'APPROVED' && data.decision !== 'REJECTED') {
      throw new BadRequestException('Decision must be APPROVED or REJECTED');
    }
    const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
    if (reason.length > 500 || (data.decision === 'REJECTED' && reason.length < 5)) {
      throw new BadRequestException('A rejection reason of 5-500 characters is required');
    }

    const result = await this.prisma.$transaction(async tx => {
      const profile = await tx.profile.findUnique({ where: { userId },
        select: { photoObjectKey: true, photoReviewStatus: true } });
      if (!profile?.photoObjectKey) throw new NotFoundException('Photo not found');
      if (profile.photoReviewStatus !== 'PENDING') {
        throw new ConflictException('Photo has already been reviewed or replaced');
      }
      // Protect against approving a photo replaced during a review.
      const updated = await tx.profile.updateMany({
        where: { userId, photoObjectKey: profile.photoObjectKey, photoReviewStatus: 'PENDING' },
        data: { photoReviewStatus: data.decision as string },
      });
      if (updated.count !== 1) throw new ConflictException('Photo changed; refresh the review queue');
      await tx.photoModerationReview.create({ data: {
        profileUserId: userId,
        moderatorId: req.authUserId,
        photoObjectKey: profile.photoObjectKey,
        decision: data.decision as string,
        reason: reason || null,
      } });
      const active = await reconcileAccount(tx, userId);
      return { status: data.decision, accountActive: active };
    });
    return result;
  }
}
