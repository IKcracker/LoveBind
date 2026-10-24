import { BadRequestException, Body, Controller, Get, HttpException, HttpStatus,
  NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { lockMemberPair } from '../discovery/member-pair';
import { decryptMessage, encryptMessage } from './message-crypto';

type DB = Prisma.TransactionClient | PrismaClient;
const identity = { status: true, ageEvidenceStatus: true, ageVerifiedAt: true } as const;

function validId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(id);
}

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(private readonly prisma: PrismaService) {}

  private async permitted(db: DB, matchId: string, viewer: string) {
    if (!validId(matchId)) throw new BadRequestException('Invalid match');
    const match = await db.match.findUnique({ where: { id: matchId },
      include: { conversation: { select: { id: true } } } });
    if (!match || match.status !== 'ACTIVE' || ![match.userAId, match.userBId].includes(viewer) || !match.conversation) {
      throw new NotFoundException('Conversation unavailable');
    }
    const members = await db.user.findMany({ where: { id: { in: [match.userAId, match.userBId] } },
      select: { id: true, status: true, adminApprovalStatus: true,
        profile: { select: { displayName: true, photoReviewStatus: true } },
        identityVerification: { select: identity } } });
    if (members.length !== 2 || members.some(member =>
      member.status !== 'ACTIVE' || member.adminApprovalStatus !== 'APPROVED' ||
      member.profile?.photoReviewStatus !== 'APPROVED' ||
      member.identityVerification?.status !== 'Approved' ||
      member.identityVerification.ageEvidenceStatus !== 'VERIFIED' ||
      !member.identityVerification.ageVerifiedAt)) {
      throw new NotFoundException('Conversation unavailable');
    }
    const blocked = await db.block.count({ where: { OR: [
      { blockerId: match.userAId, blockedId: match.userBId },
      { blockerId: match.userBId, blockedId: match.userAId },
    ] } });
    if (blocked) throw new NotFoundException('Conversation unavailable');
    const other = members.find(m => m.id !== viewer)!;
    return { conversationId: match.conversation.id, other: { id: other.id, name: other.profile?.displayName ?? 'Member' } };
  }

  @Get(':matchId/messages')
  async history(@Req() req: AuthenticatedRequest, @Param('matchId') matchId: string,
    @Query('cursor') cursor?: string) {
    if (cursor && !validId(cursor)) throw new BadRequestException('Invalid message cursor');
    const allowed = await this.permitted(this.prisma, matchId, req.authUserId);
    if (cursor) {
      const exists = await this.prisma.message.count({ where: { id: cursor, conversationId: allowed.conversationId } });
      if (!exists) throw new BadRequestException('Invalid message cursor');
    }
    const rows = await this.prisma.message.findMany({ where: {
      conversationId: allowed.conversationId, status: 'SENT' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 31, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, senderId: true, content: true, createdAt: true } });
    const hasMore = rows.length > 30;
    const page = rows.slice(0, 30);
    const nextCursor = hasMore ? page[page.length - 1].id : null;
    return { matchId, other: allowed.other,
      messages: page.reverse().map(m => ({ id: m.id, senderId: m.senderId,
        content: decryptMessage(m.content), createdAt: m.createdAt })),
      nextCursor };
  }

  @Post(':matchId/messages')
  async send(@Req() req: AuthenticatedRequest, @Param('matchId') matchId: string,
    @Body() body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Message content is required');
    const raw = (body as Record<string, unknown>).content;
    if (typeof raw !== 'string' || raw.trim().length < 1 || raw.trim().length > 1500)
      throw new BadRequestException('Message must contain between 1 and 1500 characters');
    const content = raw.trim();
    const ciphertext = encryptMessage(content);
    return this.prisma.$transaction(async tx => {
      // Use exactly the same pair lock as block/unmatch so safety mutations win.
      const match = await tx.match.findUnique({ where: { id: matchId },
        select: { userAId: true, userBId: true } });
      if (!match || ![match.userAId, match.userBId].includes(req.authUserId))
        throw new NotFoundException('Conversation unavailable');
      await lockMemberPair(tx, match.userAId, match.userBId);
      const allowed = await this.permitted(tx, matchId, req.authUserId);
      const now = new Date();
      const recent = await tx.message.findFirst({ where: {
        conversationId: allowed.conversationId, senderId: req.authUserId,
        createdAt: { gte: new Date(now.getTime() - 1500) } },
        select: { id: true } });
      const count = await tx.message.count({ where: { conversationId: allowed.conversationId,
        senderId: req.authUserId, createdAt: { gte: new Date(now.getTime() - 60_000) } } });
      if (recent || count >= 20)
        throw new HttpException('Please slow down before sending another message', HttpStatus.TOO_MANY_REQUESTS);
      const message = await tx.message.create({ data: {
        conversationId: allowed.conversationId, senderId: req.authUserId, content: ciphertext,
      }, select: { id: true, senderId: true, createdAt: true } });
      return { message: { ...message, content } };
    });
  }
}
