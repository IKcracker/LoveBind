import {
  BadRequestException, ConflictException, Controller, ForbiddenException, Get,
  NotFoundException, Param, Post, Query, Req, Body, UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { eligibleForAdminApproval, reconcileAccount } from './activation';
import { storage } from '../photos/photo.controller';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { canModerate } from '../auth/admin-bootstrap';
import { ENV_ADMIN_SUBJECT } from '../auth/admin-bootstrap';
import { AgeRecheckService } from './age-recheck.service';

function checkId(id: string) {
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) throw new BadRequestException('Invalid account identifier');
  return id;
}
function parseDecision(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Decision required');
  const data = body as Record<string, unknown>;
  if (data.decision !== 'APPROVED' && data.decision !== 'REJECTED')
    throw new BadRequestException('Decision must be APPROVED or REJECTED');
  const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
  if (reason.length > 500 || (data.decision === 'REJECTED' && reason.length < 5))
    throw new BadRequestException('A rejection reason of 5–500 characters is required');
  return { decision: data.decision, reason };
}

const memberSelect = {
  id: true, status: true, authSubject: true, adminApprovalStatus: true, createdAt: true,
  credential: { select: { email: true } },
  profile: { select: {
    displayName: true, city: true, occupation: true, bio: true, relationshipGoal: true,
    photoReviewStatus: true, photoObjectKey: true, interests: true, coreValues: true,
    isVisible: true, birthDate: true,
  } },
  identityVerification: { select: {
    status: true, ageEvidenceStatus: true, ageVerifiedAt: true, lastCheckedAt: true,
  } },
} as const;

@Controller('moderation/admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService, private readonly ageRecheck: AgeRecheckService) {}

  @Get('overview')
  async overview(@Req() req: AuthenticatedRequest) {
    if (!(await canModerate(this.prisma, req.authUserId))) throw new ForbiddenException('Administrator permission required');
    const [total, active, awaitingAdmin, pendingPhotos, verifiedAges, openReports] = await Promise.all([
      this.prisma.user.count({ where: { status: { not: 'DELETED' }, authSubject: { not: ENV_ADMIN_SUBJECT } } }),
      this.prisma.user.count({ where: { status: 'ACTIVE', authSubject: { not: ENV_ADMIN_SUBJECT } } }),
      this.prisma.user.count({ where: { adminApprovalStatus: 'PENDING', status: 'PENDING', authSubject: { not: ENV_ADMIN_SUBJECT } } }),
      this.prisma.profile.count({ where: { photoReviewStatus: 'PENDING' } }),
      this.prisma.identityVerification.count({ where: { status: 'Approved', ageEvidenceStatus: 'VERIFIED' } }),
      this.prisma.safetyReport.count({ where: { status: 'OPEN' } }),
    ]);
    return { total, active, awaitingAdmin, pendingPhotos, verifiedAges, openReports };
  }

  @Get('members')
  async members(@Req() req: AuthenticatedRequest, @Query('q') q?: string,
    @Query('status') status?: string, @Query('page') page?: string) {
    if (!(await canModerate(this.prisma, req.authUserId))) throw new ForbiddenException('Administrator permission required');
    const query = (q ?? '').trim().slice(0, 80);
    const current = Math.max(1, Math.min(1000, Number.parseInt(page || '1', 10) || 1));
    const where = {
      status: { not: 'DELETED' as const },
      authSubject: { not: ENV_ADMIN_SUBJECT },
      ...(status && ['PENDING','APPROVED','REJECTED'].includes(status)
        ? { adminApprovalStatus: status } : {}),
      ...(query ? { OR: [
        { profile: { is: { displayName: { contains: query, mode: 'insensitive' as const } } } },
        { credential: { is: { email: { contains: query, mode: 'insensitive' as const } } } },
        { id: { contains: query, mode: 'insensitive' as const } },
      ] } : {}),
    };
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, select: memberSelect,
        orderBy: { createdAt: 'desc' }, skip: (current - 1) * 25, take: 25 }),
    ]);
    return { total, page: current, pages: Math.max(1, Math.ceil(total / 25)),
      members: users.map(user => ({
        id: user.id, email: user.credential?.email ?? '', status: user.status,
        approval: user.adminApprovalStatus, createdAt: user.createdAt,
        name: user.profile?.displayName ?? 'Unnamed member',
        city: user.profile?.city ?? null,
        photoStatus: user.profile?.photoReviewStatus ?? 'NONE',
        identityStatus: user.identityVerification?.status ?? 'Not Started',
        ageStatus: user.identityVerification?.ageEvidenceStatus ?? 'PENDING',
        eligible: eligibleForAdminApproval(user),
      })) };
  }

  @Get('members/:id')
  async member(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    if (!(await canModerate(this.prisma, req.authUserId))) throw new ForbiddenException('Administrator permission required');
    const user = await this.prisma.user.findUnique({ where: { id: checkId(id) },
      select: memberSelect });
    if (!user || user.status === 'DELETED' || user.authSubject === ENV_ADMIN_SUBJECT) throw new NotFoundException('Member not found');
    const [reviews, decisions] = await Promise.all([
      this.prisma.photoModerationReview.findMany({ where: { profileUserId: id },
        select: { id: true, decision: true, reason: true, reviewedAt: true },
        orderBy: { reviewedAt: 'desc' }, take: 15 }),
      this.prisma.accountModerationDecision.findMany({ where: { userId: id },
        select: { id: true, decision: true, reason: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: 15 }),
    ]);
    let photoUrl: string | null = null;
    if (user.profile?.photoObjectKey) {
      const { client, bucket } = storage();
      photoUrl = await getSignedUrl(client, new GetObjectCommand({
        Bucket: bucket, Key: user.profile.photoObjectKey,
      }), { expiresIn: 120 });
    }
    return { id:user.id, email:user.credential?.email ?? '',
      status:user.status, approval:user.adminApprovalStatus,
      createdAt:user.createdAt, eligible:eligibleForAdminApproval(user),
      profile: user.profile ? {
        displayName:user.profile.displayName, city:user.profile.city,
        occupation:user.profile.occupation, bio:user.profile.bio,
        relationshipGoal:user.profile.relationshipGoal, interests:user.profile.interests,
        coreValues:user.profile.coreValues, photoStatus:user.profile.photoReviewStatus,
        visible:user.profile.isVisible, photoUrl,
      } : null,
      verification: user.identityVerification ? {
        status:user.identityVerification.status,
        ageEvidenceStatus:user.identityVerification.ageEvidenceStatus,
        ageVerifiedAt:user.identityVerification.ageVerifiedAt,
        lastCheckedAt:user.identityVerification.lastCheckedAt,
      } : null,
      photoReviews:reviews, accountDecisions:decisions };
  }

  @Post('members/:id/decision')
  async decide(@Req() req: AuthenticatedRequest, @Param('id') id:string,@Body() body:unknown) {
    if (!(await canModerate(this.prisma, req.authUserId))) throw new ForbiddenException('Administrator permission required');
    checkId(id);
    if (req.authUserId === id) throw new ForbiddenException('You cannot approve your own account');
    const { decision, reason } = parseDecision(body);
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { id },
        select: { ...memberSelect } });
      if (!user || user.status === 'DELETED') throw new NotFoundException('Member not found');
      if (user.status === 'SUSPENDED') throw new ForbiddenException('Suspended users cannot be approved');
      if (decision === 'APPROVED' && !eligibleForAdminApproval(user))
        throw new ConflictException('Identity, adult-age evidence, completed profile and approved photo are required before account approval');
      if (user.adminApprovalStatus === decision)
        throw new ConflictException('This account already has that review decision');
      await tx.user.update({ where: { id }, data: { adminApprovalStatus: decision } });
      await tx.accountModerationDecision.create({ data: {
        userId: id, moderatorId: req.authUserId, decision, reason: reason || null,
      } });
      const active = await reconcileAccount(tx, id);
      return { decision, accountActive: active };
    }, { isolationLevel: 'Serializable' });
  }

  @Post('members/:id/recheck-age')
  async recheckAge(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    if (!(await canModerate(this.prisma, req.authUserId))) throw new ForbiddenException('Administrator permission required');
    checkId(id);
    if (req.authUserId === id) throw new ForbiddenException('Cannot recheck your own age evidence');
    return this.ageRecheck.recheck(id, req.authUserId, 'MANUAL');
  }

  @Post('recheck-age/batch')
  async recheckAgeBatch(@Req() req: AuthenticatedRequest) {
    if (!(await canModerate(this.prisma, req.authUserId))) throw new ForbiddenException('Administrator permission required');
    return this.ageRecheck.batch(req.authUserId);
  }

  @Get('members/:id/age-rechecks')
  async ageRecheckHistory(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    if (!(await canModerate(this.prisma, req.authUserId))) throw new ForbiddenException('Administrator permission required');
    checkId(id);
    return {events:await this.ageRecheck.history(id)};
  }

  @Get('activity')
  async activity(@Req() req: AuthenticatedRequest) {
    if (!(await canModerate(this.prisma, req.authUserId))) throw new ForbiddenException('Administrator permission required');
    const [account, photos] = await Promise.all([
      this.prisma.accountModerationDecision.findMany({
        select: { id: true, userId: true, decision: true, reason: true,
          createdAt: true, moderatorId: true },
        orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.photoModerationReview.findMany({
        select: { id: true, profileUserId: true, decision: true, reason: true,
          reviewedAt: true, moderatorId: true },
        orderBy: { reviewedAt: 'desc' }, take: 30 }),
    ]);
    return { events: [
      ...account.map(x => ({ id: x.id, type:'ACCOUNT', memberId:x.userId,
        moderatorId:x.moderatorId, decision:x.decision, reason:x.reason, createdAt:x.createdAt })),
      ...photos.map(x => ({ id: x.id, type:'PHOTO', memberId:x.profileUserId,
        moderatorId:x.moderatorId, decision:x.decision, reason:x.reason, createdAt:x.reviewedAt })),
    ].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0,40) };
  }
}
