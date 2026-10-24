import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { parsePreferences } from '../auth/auth.validation';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('preferences')
@UseGuards(AuthGuard)
export class PreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  get(@Req() request: AuthenticatedRequest) {
    return this.prisma.partnerPreference.findUnique({ where: { userId: request.authUserId } });
  }

  @Put('me')
  update(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const fields = parsePreferences(body);
    return this.prisma.partnerPreference.upsert({
      where: { userId: request.authUserId },
      update: fields,
      create: { userId: request.authUserId, ...fields },
    });
  }
}
