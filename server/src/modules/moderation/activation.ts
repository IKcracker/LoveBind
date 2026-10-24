import { Prisma, PrismaClient } from '@prisma/client';

type Database = Prisma.TransactionClient | PrismaClient;

function age(birth: Date, now: Date): number {
  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) years--;
  return years;
}

export function eligibleForAdminApproval(record: {
  status: string;
  identityVerification: { status: string; ageEvidenceStatus: string; ageVerifiedAt: Date | null } | null;
  profile: { birthDate: Date; city: string | null; bio: string | null; relationshipGoal: string | null;
    photoObjectKey: string | null; photoReviewStatus: string } | null;
}, now = new Date()): boolean {
  return record.identityVerification?.status === 'Approved' &&
    record.identityVerification.ageEvidenceStatus === 'VERIFIED' &&
    record.identityVerification.ageVerifiedAt !== null &&
    !!record.profile?.city?.trim() && !!record.profile.bio?.trim() &&
    !!record.profile.relationshipGoal?.trim() &&
    !!record.profile.photoObjectKey &&
    record.profile.photoReviewStatus === 'APPROVED' &&
    age(record.profile.birthDate, now) >= 18;
}

export async function reconcileAccount(db: Database, userId: string): Promise<boolean> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: {
    status: true, adminApprovalStatus: true,
    identityVerification: { select: { status: true, ageEvidenceStatus: true, ageVerifiedAt: true } },
    profile: { select: { birthDate: true, city: true, bio: true, relationshipGoal: true,
      photoObjectKey: true, photoReviewStatus: true } },
  } });
  // Moderation never restores a suspended or deleted account.
  if (user.status === 'DELETED' || user.status === 'SUSPENDED') return false;
  const activated = eligibleForAdminApproval(user) && user.adminApprovalStatus === 'APPROVED';
  if (user.status !== (activated ? 'ACTIVE' : 'PENDING')) {
    await db.user.update({ where: { id: userId },
      data: { status: activated ? 'ACTIVE' : 'PENDING' } });
  }
  if (!activated) {
    await db.profile.updateMany({ where: { userId, isVisible: true }, data: { isVisible: false } });
  }
  return activated;
}

type Obj = Record<string, unknown>;
function obj(input: unknown): Obj | null {
  return input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Obj : null;
}

function cleanDate(input: unknown): string | null {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const dt = new Date(input + 'T00:00:00Z');
  return Number.isNaN(dt.getTime()) || dt.toISOString().slice(0,10) !== input ? null : input;
}
export type AgeDecision = 'VERIFIED' | 'MISSING' | 'UNDERAGE' | 'DOB_MISMATCH' | 'CHECKS_INCOMPLETE';

export function evaluateDiditAge(payload: unknown, registeredBirthDate: Date,
  now = new Date()): AgeDecision {
  const root = obj(payload);
  if (!root || root.status !== 'Approved') return 'CHECKS_INCOMPLETE';
  const result = obj(root.decision) ?? root;
  const ids = Array.isArray(result.id_verifications) ? result.id_verifications : [];
  const liveness = Array.isArray(result.liveness_checks) ? result.liveness_checks : [];
  const faces = Array.isArray(result.face_matches) ? result.face_matches : [];
  // All three workflow checks must show their own positive result.
  if (!ids.length || !liveness.some(x => obj(x)?.status === 'Approved') ||
      !faces.some(x => obj(x)?.status === 'Approved')) return 'CHECKS_INCOMPLETE';
  const verifiedIds = ids.map(obj).filter((x): x is Obj => x !== null && x.status === 'Approved');
  if (verifiedIds.length !== 1) return 'CHECKS_INCOMPLETE';
  const dob = cleanDate(verifiedIds[0].date_of_birth);
  if (!dob) return 'MISSING';
  const date = new Date(dob + 'T00:00:00Z');
  if (age(date, now) < 18) return 'UNDERAGE';
  if (registeredBirthDate.toISOString().slice(0,10) !== dob) return 'DOB_MISMATCH';
  return 'VERIFIED';
}
