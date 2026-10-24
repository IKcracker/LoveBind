import { BadRequestException, Body, Controller, ForbiddenException, Get, Put, Req, UseGuards } from '@nestjs/common';

import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { parseProfile } from '../auth/auth.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { eligibleForAdminApproval, reconcileAccount } from '../moderation/activation';

@Controller('profiles')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  get(@Req() request: AuthenticatedRequest) {
    return this.prisma.profile.findUniqueOrThrow({ where: { userId: request.authUserId } });
  }

  @Put('me/visibility')
  async setVisibility(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
    if (!input || typeof input.visible !== 'boolean') throw new BadRequestException('visible must be true or false');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: request.authUserId }, select: {
      status: true, adminApprovalStatus: true,
      profile: { select: { birthDate: true, city: true, bio: true, relationshipGoal: true,
        photoObjectKey: true, photoReviewStatus: true } },
      identityVerification: { select: { status: true, ageEvidenceStatus: true, ageVerifiedAt: true } },
    } });
    if (input.visible && (user.status !== 'ACTIVE' || user.adminApprovalStatus !== 'APPROVED' ||
        !eligibleForAdminApproval(user))) {
      throw new ForbiddenException('Complete identity, adult-age, photo and account approval before joining discovery');
    }
    const profile = await this.prisma.profile.update({ where: { userId: request.authUserId },
      data: { isVisible: input.visible }, select: { isVisible: true } });
    return { visible: profile.isVisible };
  }

  @Put('me')
  async update(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const fields = parseProfile(body);
    const current = await this.prisma.profile.findUniqueOrThrow({ where: { userId: request.authUserId }, select: { city: true, cityPlaceId: true } });
    if (fields.cityPlaceId) {
      if (!/^geonames:[1-9][0-9]{0,9}$/.test(fields.cityPlaceId)) throw new BadRequestException('Select a valid city');
      const cityRecord = await this.prisma.geoCity.findUnique({ where: { id: Number(fields.cityPlaceId.slice(9)) } });
      if (!cityRecord) throw new BadRequestException('Select a city from suggestions');
      const selected = { city: cityRecord.name };
      if (fields.city && fields.city !== selected.city) throw new BadRequestException('Select a valid city suggestion');
      fields.city = selected.city;
    } else if (fields.city !== undefined && fields.city !== current.city) {
      throw new BadRequestException('Select your city from the suggestions');
    }
    return this.prisma.$transaction(async tx => {
      const profile = await tx.profile.update({
      where: { userId: request.authUserId },
      data: fields,
      select: { displayName: true, city: true, cityPlaceId: true, bio: true, relationshipGoal: true, occupation: true, interests: true, coreValues: true, photoReviewStatus: true, isVisible: true },
      });
      await tx.user.update({ where: { id: request.authUserId }, data: { adminApprovalStatus: 'PENDING' } });
      await reconcileAccount(tx, request.authUserId);
      return profile;
    });
  }
}
