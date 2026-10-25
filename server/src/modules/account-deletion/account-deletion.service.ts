import { ForbiddenException, Injectable, HttpException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ENV_ADMIN_SUBJECT } from '../auth/admin-bootstrap';
import { tokenDigest } from '../auth/auth.service';
import { verifyPassword } from '../auth/password';
import { parseDeletion, retentionPolicy } from './deletion-policy';

@Injectable()
export class AccountDeletionService {
  constructor(private readonly db: PrismaService) {}

  async remove(userId: string, token: string, input: unknown) {
    const { password } = parseDeletion(input);
    const policy = retentionPolicy();
    // Committed independently: failed confirmations must also count, on every API replica.
    const attempts = await this.db.$queryRaw<{ count: number }[]>`
      INSERT INTO "DeletionAttempt" ("userId", "windowStart", "count") VALUES (${userId}, NOW(), 1)
      ON CONFLICT ("userId") DO UPDATE SET
        "count" = CASE WHEN "DeletionAttempt"."windowStart" < NOW() - INTERVAL '15 minutes'
          THEN 1 ELSE "DeletionAttempt"."count" + 1 END,
        "windowStart" = CASE WHEN "DeletionAttempt"."windowStart" < NOW() - INTERVAL '15 minutes'
          THEN NOW() ELSE "DeletionAttempt"."windowStart" END RETURNING "count"`;
    if (attempts[0].count > 5) throw new HttpException('Too many confirmations. Try again in 15 minutes.', 429);
    const credential = await this.db.emailCredential.findUnique({ where: { userId } });
    if (!credential || !(await verifyPassword(password, credential.passwordHash)))
      throw new UnauthorizedException('Current password is incorrect');

    return this.db.$transaction(async tx => {
      // Serialize with all writes to personal tables (database guards acquire SHARE).
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.authSubject === ENV_ADMIN_SUBJECT) throw new ForbiddenException('Operator accounts require administrator offboarding');
      if (user.status === 'DELETED') throw new UnauthorizedException('Account unavailable');
      const session = await tx.authSession.findUnique({ where: { tokenDigest: tokenDigest(token) } });
      const current = await tx.emailCredential.findUnique({ where: { userId } });
      if (!session || session.userId !== userId || session.revokedAt || session.expiresAt <= new Date() ||
          current?.passwordHash !== credential.passwordHash)
        throw new UnauthorizedException('Please sign in again before deleting your account');
      const now = new Date();
      const verification = await tx.identityVerification.findUnique({ where: { userId } });
      // Retain review decisions, not copies of photos or storage URLs.
      const photoReviews = await tx.photoModerationReview.findMany({ where: { profileUserId: userId },
        select: { id: true, moderatorId: true, decision: true, reason: true, reviewedAt: true } });
      await tx.accountDeletion.create({ data: {
        userId, policyVersion: policy.version,
        retentionUntil: new Date(now.getTime() + policy.safetyDays * 86400000),
        financialUntil: new Date(now.getTime() + policy.financialDays * 86400000),
        photoReviewEvidence: JSON.parse(JSON.stringify(photoReviews)),
      } });
      // Prefix sweep includes superseded photos and unfinished uploads. Wait beyond signed PUT lifetime.
      await tx.deletionTask.create({ data: { userId, kind: 'PHOTO_PREFIX',
        target: 'profiles/' + userId + '/', notBefore: new Date(now.getTime() + 10 * 60_000) } });
      if (verification) await tx.deletionTask.create({ data: { userId, kind: 'DIDIT_SESSION',
        target: verification.providerSessionId, notBefore: now } });
      await tx.user.update({ where: { id: userId }, data: {
        status: 'DELETED', adminApprovalStatus: 'DELETED', authSubject: randomUUID(),
      } });
      await tx.authSession.deleteMany({ where: { userId } });
      await tx.emailCredential.deleteMany({ where: { userId } });
      await tx.partnerPreference.deleteMany({ where: { userId } });
      await tx.profile.deleteMany({ where: { userId } });
      await tx.identityVerification.deleteMany({ where: { userId } });
      await tx.consentRecord.deleteMany({ where: { userId } });
      const matches = { OR: [{ userAId: userId }, { userBId: userId }] };
      await tx.match.updateMany({ where: matches, data: { status: 'CLOSED' } });
      // Entire closed conversations and shared quiz results are erased, including both sides.
      await tx.conversation.deleteMany({ where: { match: matches } });
      await tx.quizSession.deleteMany({ where: { match: matches } });
      await tx.like.deleteMany({ where: { OR: [{ fromId: userId }, { toId: userId }] } });
      await tx.pass.deleteMany({ where: { OR: [{ fromId: userId }, { toId: userId }] } });
      await tx.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
      // Payment execution is not implemented on main. Preserve ledger and purchase records,
      // but remove meeting location and cancel participation without inventing refunds.
      await tx.dateRequest.updateMany({ where: { match: matches }, data: { status: 'CANCELLED', placeText: null } });
      await tx.deletionAttempt.deleteMany({ where: { userId } });
      return { deleted: true, externalCleanup: 'PENDING', reference: userId };
    }, { timeout: 15000 });
  }
}
