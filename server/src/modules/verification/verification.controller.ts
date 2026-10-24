import { BadGatewayException, BadRequestException, Controller, Get, Post, Req, Body, ServiceUnavailableException, UseGuards, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { fetchDidit, hostedDiditUrl } from './didit-error';

type SessionResponse = { session_id?: string; url?: string; session_url?: string };
const BASE = 'https://verification.didit.me/v3';

@Controller('verification')
@UseGuards(AuthGuard)
export class VerificationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async current(@Req() request: AuthenticatedRequest) {
    const record = await this.prisma.identityVerification.findUnique({
      where: { userId: request.authUserId },
      select: { status: true, createdAt: true, lastCheckedAt: true },
    });
    return { provider: 'didit', status: record?.status ?? 'Not Started', record };
  }

  // Authentication is required, but this response contains no credentials.
  @Get('config')
  config() {
    return { provider: 'didit', available: Boolean(process.env.DIDIT_API_KEY?.trim() && process.env.DIDIT_WORKFLOW_ID?.trim()) };
  }

  @Post('session')
  async start(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const obj = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
    if (obj.consent !== true) throw new BadRequestException('Consent for identity verification is required');
    const apiKey = process.env.DIDIT_API_KEY;
    const workflowId = process.env.DIDIT_WORKFLOW_ID;
    if (!apiKey || !workflowId) throw new ServiceUnavailableException('Identity verification is not configured yet');
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: request.authUserId }, select: { profile: { select: { city: true, bio: true, relationshipGoal: true } } },
    });
    if (!user.profile?.city || !user.profile?.bio || !user.profile?.relationshipGoal) {
      throw new BadRequestException('Complete your LoveBind profile first');
    }
    const existing = await this.prisma.identityVerification.findUnique({ where: { userId: request.authUserId } });
    if (existing && !['Declined', 'Expired', 'Abandoned', 'Not Started'].includes(existing.status)) {
      throw new BadRequestException('A verification session is already in progress or awaiting review');
    }
    const response = await fetchDidit(BASE + '/session/', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: workflowId, vendor_data: request.authUserId }),
      signal: AbortSignal.timeout(15000),
    }, 'create-session');
    const result = await response.json().catch(() => null) as SessionResponse | null;
    const url = hostedDiditUrl(result?.url ?? result?.session_url);
    if (!result || typeof result.session_id !== 'string' || result.session_id.length < 6 ||
        result.session_id.length > 160 || !url) {
      Logger.warn('Didit create-session: malformed successful response (missing session ID or safe hosted URL)', 'Didit');
      throw new BadGatewayException({
        code: 'DIDIT_INVALID_RESPONSE',
        message: 'Didit returned an invalid verification link. Please contact LoveBind support.',
      });
    }
    await this.prisma.identityVerification.upsert({
      where: { userId: request.authUserId },
      create: { userId: request.authUserId, providerSessionId: result.session_id, consentAt: new Date() },
      update: { providerSessionId: result.session_id, status: 'Not Started', consentAt: new Date(), lastCheckedAt: null },
    });
    return { url, status: 'Not Started' };
  }

  @Post('refresh')
  async refresh(@Req() request: AuthenticatedRequest) {
    const apiKey = process.env.DIDIT_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('Identity verification is not configured yet');
    const item = await this.prisma.identityVerification.findUnique({ where: { userId: request.authUserId } });
    if (!item) return { status: 'Not Started' };
    const response = await fetchDidit(BASE + '/session/' + encodeURIComponent(item.providerSessionId) + '/decision/', {
      headers: { 'x-api-key': apiKey }, signal: AbortSignal.timeout(15000),
    }, 'fetch-decision');
    const result = await response.json().catch(() => null) as { status?: unknown } | null;
    if (!result || typeof result.status !== 'string') {
      Logger.warn('Didit fetch-decision: malformed successful response', 'Didit');
      throw new BadGatewayException({
        code: 'DIDIT_INVALID_RESPONSE',
        message: 'The verification status could not be read. Please try again later.',
      });
    }
    const known = ['Not Started', 'In Progress', 'In Review', 'Approved', 'Declined', 'Resubmitted', 'Awaiting User', 'Expired', 'Abandoned', 'Kyc Expired'];
    const status = typeof result.status === 'string' && known.includes(result.status) ? result.status : 'In Review';
    await this.prisma.identityVerification.update({ where: { userId: request.authUserId }, data: { status, lastCheckedAt: new Date() } });
    // Important: provider approval alone does not make a profile discoverable.
    // Age proof and safety review must be implemented before changing User.status.
    return { status };
  }
}
