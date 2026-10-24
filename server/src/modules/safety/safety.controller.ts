import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { canModerate } from '../auth/admin-bootstrap';
import { optionalText, requiredText } from '../auth/auth.validation';
import { lockMemberPair, validateOtherMember } from '../discovery/member-pair';
import type { Prisma } from '@prisma/client';

const CATEGORIES = ['HARASSMENT', 'HATE', 'SCAM', 'IMPERSONATION', 'UNDERAGE', 'INAPPROPRIATE_CONTENT', 'OTHER'];
function input(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('A JSON object is required');
  return body as Record<string, unknown>;
}

@Controller('safety')
@UseGuards(AuthGuard)
export class SafetyController {
  constructor(private readonly db: PrismaService) {}

  private async target(tx: Prisma.TransactionClient, me: string, id: string) {
    validateOtherMember(me, id);
    await lockMemberPair(tx, me, id);
    if (!(await tx.profile.count({ where: { userId: id } }))) throw new NotFoundException('Member not available');
  }

  private async endConnection(tx: Prisma.TransactionClient, me: string, id: string) {
    const [userAId, userBId] = [me, id].sort();
    await tx.match.updateMany({ where: { userAId, userBId, status: 'ACTIVE' }, data: { status: 'CLOSED' } });
    await tx.like.deleteMany({ where: { OR: [{ fromId: me, toId: id }, { fromId: id, toId: me }] } });
  }

  @Post('members/:id/block')
  async block(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.db.$transaction(async tx => {
      await this.target(tx, req.authUserId, id);
      await tx.block.upsert({ where: { blockerId_blockedId: { blockerId: req.authUserId, blockedId: id } },
        create: { blockerId: req.authUserId, blockedId: id }, update: {} });
      await this.endConnection(tx, req.authUserId, id);
      return { blocked: true };
    });
  }

  @Get('blocks')
  async blocks(@Req() req: AuthenticatedRequest) {
    const rows = await this.db.block.findMany({ where: { blockerId: req.authUserId }, orderBy: { createdAt: 'desc' },
      select: { blockedId: true, createdAt: true, blocked: { select: { profile: { select: { displayName: true } } } } } });
    return { blocks: rows.map(row => ({ memberId: row.blockedId, name: row.blocked.profile?.displayName ?? 'Member', createdAt: row.createdAt })) };
  }

  @Post('members/:id/unblock')
  async unblock(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    validateOtherMember(req.authUserId, id);
    return this.db.$transaction(async tx => {
      await lockMemberPair(tx, req.authUserId, id);
      await tx.block.deleteMany({ where: { blockerId: req.authUserId, blockedId: id } });
      // Neither prior likes nor closed matches are restored.
      return { blocked: false };
    });
  }

  @Post('members/:id/report')
  async report(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    const fields = input(body);
    if (typeof fields.category !== 'string' || !CATEGORIES.includes(fields.category)) throw new BadRequestException('Choose a report category');
    const category = fields.category;
    const details = optionalText(fields.details, 'details', 2000);
    if (fields.block !== undefined && typeof fields.block !== 'boolean') throw new BadRequestException('block must be true or false');
    return this.db.$transaction(async tx => {
      await this.target(tx, req.authUserId, id);
      // Repeated taps/retries do not flood the queue. Reports remain private.
      const existing = await tx.safetyReport.findFirst({ where: { reporterId: req.authUserId, reportedId: id,
        category, status: { in: ['OPEN', 'REVIEWING'] } }, select: { id: true, status: true } });
      const report = existing ?? await tx.safetyReport.create({ data: { reporterId: req.authUserId, reportedId: id, category, details }, select: { id: true, status: true } });
      if (fields.block === true) {
        await tx.block.upsert({ where: { blockerId_blockedId: { blockerId: req.authUserId, blockedId: id } },
          create: { blockerId: req.authUserId, blockedId: id }, update: {} });
        await this.endConnection(tx, req.authUserId, id);
      }
      return report;
    });
  }

  @Post('matches/:id/unmatch')
  async unmatch(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const match = await this.db.match.findUnique({ where: { id } });
    if (!match || ![match.userAId, match.userBId].includes(req.authUserId)) throw new NotFoundException('Match not available');
    const other = match.userAId === req.authUserId ? match.userBId : match.userAId;
    return this.db.$transaction(async tx => {
      await lockMemberPair(tx, req.authUserId, other);
      await this.endConnection(tx, req.authUserId, other);
      await tx.pass.upsert({ where: { fromId_toId: { fromId: req.authUserId, toId: other } },
        create: { fromId: req.authUserId, toId: other }, update: {} });
      return { unmatched: true };
    });
  }

  @Get('reports')
  async reports(@Req() req: AuthenticatedRequest, @Query('status') status = 'OPEN', @Query('page') page = '1') {
    if (!(await canModerate(this.db, req.authUserId))) throw new ForbiddenException('Moderator access required');
    if (!['OPEN', 'REVIEWING', 'RESOLVED'].includes(status)) throw new BadRequestException('Invalid report status');
    const current = Math.max(1, Math.min(1000, Number.parseInt(page, 10) || 1));
    const where = { status: status as 'OPEN' | 'REVIEWING' | 'RESOLVED' };
    const [total, reports] = await Promise.all([
      this.db.safetyReport.count({ where }),
      this.db.safetyReport.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 30, skip: (current - 1) * 30,
        select: { id: true, reporterId: true, reportedId: true, category: true, details: true, status: true, createdAt: true,
          reviewedBy: true, reviewedAt: true, resolution: true,
          reported: { select: { profile: { select: { displayName: true } } } } } }),
    ]);
    return { reports, total, page: current, pages: Math.max(1, Math.ceil(total / 30)) };
  }

  @Post('reports/:id/review')
  async review(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    if (!(await canModerate(this.db, req.authUserId))) throw new ForbiddenException('Moderator access required');
    const fields = input(body);
    if (fields.status !== 'REVIEWING' && fields.status !== 'RESOLVED') throw new BadRequestException('Choose REVIEWING or RESOLVED');
    const status = fields.status;
    const resolution = requiredText(fields.resolution, 'resolution', 5, 2000);
    return this.db.$transaction(async tx => {
      const report = await tx.safetyReport.findUnique({ where: { id } });
      if (!report) throw new NotFoundException('Report not available');
      if ([report.reporterId, report.reportedId].includes(req.authUserId)) throw new ForbiddenException('Another moderator must review this report');
      if (report.status === 'RESOLVED') throw new ConflictException('This report is already resolved');
      const result = await tx.safetyReport.updateMany({ where: { id, status: report.status },
        data: { status, resolution, reviewedBy: req.authUserId, reviewedAt: new Date() } });
      if (!result.count) throw new ConflictException('Report changed; refresh before reviewing');
      return { id, status };
    });
  }
}
