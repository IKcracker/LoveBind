import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { parseProfile } from '../auth/auth.validation';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('profiles')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  get(@Req() request: AuthenticatedRequest) {
    return this.prisma.profile.findUniqueOrThrow({ where: { userId: request.authUserId } });
  }

  @Put('me')
  update(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const fields = parseProfile(body);
    return this.prisma.profile.update({
      where: { userId: request.authUserId },
      data: fields,
      select: { displayName: true, city: true, bio: true, relationshipGoal: true, occupation: true, interests: true, coreValues: true, photoReviewStatus: true, isVisible: true },
    });
  }
}
