import type { PrismaClient } from '@prisma/client';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { storage } from '../photos/photo.controller';

export async function eraseExternal(kind: string, target: string, userId: string) {
  if (kind === 'DIDIT_SESSION') {
    if (!process.env.DIDIT_API_KEY) throw new Error('PROVIDER_NOT_CONFIGURED');
    const response = await fetch('https://verification.didit.me/v3/session/' + encodeURIComponent(target) + '/delete/', {
      method: 'DELETE', headers: { 'x-api-key': process.env.DIDIT_API_KEY }, signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 204 && response.status !== 404) throw new Error('PROVIDER_DELETE_FAILED');
    return;
  }
  if (kind !== 'PHOTO_PREFIX' || target !== 'profiles/' + userId + '/') throw new Error('INVALID_CLEANUP_TARGET');
  const { client, bucket } = storage();
  try {
    // Re-list from the beginning after each deletion: no skipped keys when a page disappears.
    for (let page = 0; page < 100; page++) {
      const objects = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: target, MaxKeys: 1000 }));
      if (!objects.Contents?.length) return;
      const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket,
        Delete: { Objects: objects.Contents.map(o => ({ Key: o.Key! })), Quiet: true } }));
      if (result.Errors?.length) throw new Error('STORAGE_DELETE_FAILED');
    }
    throw new Error('STORAGE_RETRY_REQUIRED');
  } finally { client.destroy(); }
}

export async function runDeletionCleanup(db: PrismaClient, now = new Date(), erase = eraseExternal) {
  // Single worker per database; session lock would be unsafe with a pooled connection.
  // Claim each task with a conditional lease; external operations are idempotent on retry.
  const tasks = await db.deletionTask.findMany({ where: { completedAt: null, notBefore: { lte: now } }, take: 100 });
  for (const task of tasks) {
    const claimed = await db.deletionTask.updateMany({ where: { id: task.id, completedAt: null, notBefore: task.notBefore },
      data: { notBefore: new Date(now.getTime() + 30 * 60_000), attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      if (!task.target) throw new Error('MISSING_TARGET');
      await erase(task.kind, task.target, task.userId);
      await db.deletionTask.update({ where: { id: task.id }, data: { target: null, completedAt: now, lastError: null } });
    } catch {
      // Never persist provider bodies, URLs, credentials or arbitrary exception text.
      await db.deletionTask.update({ where: { id: task.id }, data: { lastError: 'EXTERNAL_CLEANUP_FAILED' } });
    }
  }
  const due = await db.accountDeletion.findMany({ where: {
    OR: [{ retentionUntil: { lte: now }, safetyPurgedAt: null }, { financialUntil: { lte: now }, financialPurgedAt: null }],
  }, take: 100 });
  for (const record of due) await db.$transaction(async tx => {
    // Hold updates and purge cannot race. Operators must lock this row when recording a hold.
    await tx.$queryRaw`SELECT "userId" FROM "AccountDeletion" WHERE "userId" = ${record.userId} FOR UPDATE`;
    const current = await tx.accountDeletion.findUniqueOrThrow({ where: { userId: record.userId } });
    if (current.holdUntil && current.holdUntil > now) return;
    const userId = current.userId;
    if (!current.safetyPurgedAt && current.retentionUntil <= now) {
      // Preserve a report if its other deleted participant has an unexpired legal hold.
      const held = await tx.accountDeletion.findMany({ where: { holdUntil: { gt: now } }, select: { userId: true } });
      const heldIds = held.map(x => x.userId);
      await tx.safetyReport.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedId: userId }],
        reporterId: { notIn: heldIds }, reportedId: { notIn: heldIds } } });
      if (await tx.safetyReport.count({ where: { OR: [{ reporterId: userId }, { reportedId: userId }] } })) return;
      await tx.accountModerationDecision.deleteMany({ where: { userId } });
      await tx.ageEvidenceRecheck.deleteMany({ where: { memberId: userId } });
      await tx.accountDeletion.update({ where: { userId }, data: { photoReviewEvidence: [], safetyPurgedAt: now } });
    }
    if (!current.financialPurgedAt && current.financialUntil <= now) {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      // Outstanding funds are a review obligation, never silently confiscated or refunded.
      if (wallet && (wallet.available !== 0 || wallet.reserved !== 0)) return;
      await tx.dateRequest.deleteMany({ where: { OR: [{ requesterId: userId }, { inviteeId: userId }] } });
      await tx.purchase.deleteMany({ where: { userId } });
      if (wallet) {
        await tx.walletEntry.deleteMany({ where: { walletId: wallet.id } });
        await tx.wallet.delete({ where: { id: wallet.id } });
      }
      await tx.accountDeletion.update({ where: { userId }, data: { financialPurgedAt: now } });
    }
  });
  await db.deletionAttempt.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86400000) } } });
  return { pendingExternal: await db.deletionTask.count({ where: { completedAt: null } }) };
}
