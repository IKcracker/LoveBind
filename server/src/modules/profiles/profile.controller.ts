import { BadRequestException, Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { LocationsController } from '../locations/locations.controller';
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
  async update(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const fields = parseProfile(body);
    const current = await this.prisma.profile.findUniqueOrThrow({ where: { userId: request.authUserId }, select: { city: true, cityPlaceId: true } });
    if (fields.cityPlaceId) {
      const selected = await new LocationsController().place(fields.cityPlaceId);
      if (fields.city && fields.city !== selected.city) throw new BadRequestException('Select a valid city suggestion');
      fields.city = selected.city;
    } else if (fields.city !== undefined && fields.city !== current.city) {
      throw new BadRequestException('Select your city from the suggestions');
    }
    return this.prisma.profile.update({
      where: { userId: request.authUserId },
      data: fields,
      select: { displayName: true, city: true, cityPlaceId: true, bio: true, relationshipGoal: true, occupation: true, interests: true, coreValues: true, photoReviewStatus: true, isVisible: true },
    });
  }
}
