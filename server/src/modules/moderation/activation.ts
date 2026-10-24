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
  return Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== input ? null : input;
}
export type AgeDecision = 'VERIFIED' | 'MISSING' | 'UNDERAGE' | 'DOB_MISMATCH' | 'CHECKS_INCOMPLETE';
export type AgeEvidenceIssue =
  | 'SESSION_NOT_APPROVED' | 'ID_CHECK_MISSING' | 'ID_CHECK_NOT_APPROVED'
  | 'MULTIPLE_ID_CHECKS' | 'LIVENESS_MISSING' | 'LIVENESS_NOT_APPROVED'
  | 'FACE_MATCH_MISSING' | 'FACE_MATCH_NOT_APPROVED' | 'DOCUMENT_DOB_MISSING'
  | 'DOCUMENT_UNDERAGE' | 'DOCUMENT_DOB_MISMATCH';
export type DiditAgeEvaluation = { status: AgeDecision; issue: AgeEvidenceIssue | null };

function isApproved(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === 'approved';
}
function hasEvidenceKeys(record: Obj): boolean {
  return ['id_verifications', 'liveness_checks', 'face_matches', 'id_verification', 'liveness', 'face_match']
    .some(key => Object.prototype.hasOwnProperty.call(record, key));
}
function checks(result: Obj, plural: string, singular: string): Obj[] {
  // V3 returns arrays, but some Didit product documentation shows singular objects.
  // An explicitly empty array is not silently replaced by a different field.
  const items = result[plural];
  if (Array.isArray(items)) return items.map(obj).filter((x): x is Obj => x !== null);
  const single = obj(result[singular]);
  return single ? [single] : [];
}
function positive(check: Obj): boolean {
  // A score alone does NOT prove approval. Reject explicitly negative indicators.
  return isApproved(check.status) && check.passed !== false && check.is_document_valid !== false;
}

type CheckGroup = 'id' | 'liveness' | 'faceMatch';
type EvidenceContainer = { location: 'root' | 'decision' | 'decision_v3'; value: Obj };
function evidenceContainers(root: Obj): EvidenceContainer[] {
  const decision = obj(root.decision);
  const decisionV3 = obj(root.decision_v3);
  return [
    ...(decision ? [{ location: 'decision' as const, value: decision }] : []),
    ...(decisionV3 ? [{ location: 'decision_v3' as const, value: decisionV3 }] : []),
    { location: 'root' as const, value: root },
  ];
}
function groupCount(result: Obj, type: CheckGroup): number {
  if (type === 'id') return checks(result, 'id_verifications', 'id_verification').length;
  if (type === 'liveness') return checks(result, 'liveness_checks', 'liveness').length;
  return checks(result, 'face_matches', 'face_match').length;
}
function selectEvidenceContainer(root: Obj): EvidenceContainer | undefined {
  const candidates = evidenceContainers(root);
  // A response may contain summary evidence inside decision alongside full
  // V3 checks at the root. Prefer a complete, self-contained set of checks.
  // Never merge fields from separate containers to manufacture a pass.
  return candidates.find(x => groupCount(x.value, 'id') > 0 &&
    groupCount(x.value, 'liveness') > 0 && groupCount(x.value, 'faceMatch') > 0)
    ?? candidates.find(x => hasEvidenceKeys(x.value));
}
export function summarizeDiditEvidence(payload: unknown, currentWorkflowId?: string): {
  providerStatus: string;
  workflowMatchesCurrent: boolean | null;
  selectedLocation: string | null;
  containers: { location: string; idChecks: number; livenessChecks: number; faceMatches: number }[];
} {
  const root = obj(payload);
  if (!root) return { providerStatus: 'Unknown', workflowMatchesCurrent: null,
    selectedLocation: null, containers: [] };
  const sourceWorkflowId = typeof root.workflow_id === 'string' ? root.workflow_id
    : typeof obj(root.session)?.workflow_id === 'string' ? obj(root.session)!.workflow_id as string : null;
  return {
    providerStatus: typeof root.status === 'string' ? root.status : 'Unknown',
    workflowMatchesCurrent: sourceWorkflowId && currentWorkflowId
      ? sourceWorkflowId === currentWorkflowId : null,
    selectedLocation: selectEvidenceContainer(root)?.location ?? null,
    containers: evidenceContainers(root).map(({ location, value }) => ({
      location,
      idChecks: groupCount(value, 'id'),
      livenessChecks: groupCount(value, 'liveness'),
      faceMatches: groupCount(value, 'faceMatch'),
    })),
  };
}

export function evaluateDiditAgeEvidence(payload: unknown, registeredBirthDate: Date,
  now = new Date()): DiditAgeEvaluation {
  const fail = (status: AgeDecision, issue: AgeEvidenceIssue): DiditAgeEvaluation => ({ status, issue });
  const root = obj(payload);
  if (!root || !isApproved(root.status)) return fail('CHECKS_INCOMPLETE', 'SESSION_NOT_APPROVED');

  // GET /v3/session/{id}/decision/ generally returns V3 arrays at the root.
  // Webhooks may wrap them in `decision`, while other SDKs use `decision_v3`.
  // We require a self-contained evidence object; never combine checks from
  // different objects to manufacture a passing result.
  const result = selectEvidenceContainer(root)?.value;
  if (!result) return fail('CHECKS_INCOMPLETE', 'ID_CHECK_MISSING');

  const ids = checks(result, 'id_verifications', 'id_verification');
  const liveness = checks(result, 'liveness_checks', 'liveness');
  const faces = checks(result, 'face_matches', 'face_match');

  if (!ids.length) return fail('CHECKS_INCOMPLETE', 'ID_CHECK_MISSING');
  // A workflow with multiple conflicting ID checks needs a verified, explicit
  // node mapping. Never pick an arbitrary document for the age decision.
  if (ids.length !== 1) return fail('CHECKS_INCOMPLETE', 'MULTIPLE_ID_CHECKS');
  if (!positive(ids[0])) return fail('CHECKS_INCOMPLETE', 'ID_CHECK_NOT_APPROVED');
  if (!liveness.length) return fail('CHECKS_INCOMPLETE', 'LIVENESS_MISSING');
  if (!liveness.some(positive) || liveness.some(x => x.status !== undefined && !positive(x)))
    return fail('CHECKS_INCOMPLETE', 'LIVENESS_NOT_APPROVED');
  if (!faces.length) return fail('CHECKS_INCOMPLETE', 'FACE_MATCH_MISSING');
  // Didit V3 can return `match: true` instead of `status: "Approved"`.
  // Explicit negative results always override a positive match indicator.
  const facePassed = (x: Obj) =>
    x.match !== false && x.matched !== false &&
    (x.status === undefined ? x.match === true : isApproved(x.status));
  if (!faces.some(facePassed) || faces.some(x => !facePassed(x)))
    return fail('CHECKS_INCOMPLETE', 'FACE_MATCH_NOT_APPROVED');

  const dob = cleanDate(ids[0].date_of_birth);
  if (!dob) return fail('MISSING', 'DOCUMENT_DOB_MISSING');
  if (age(new Date(dob + 'T00:00:00Z'), now) < 18) return fail('UNDERAGE', 'DOCUMENT_UNDERAGE');
  if (!Number.isFinite(registeredBirthDate.getTime()) ||
      registeredBirthDate.toISOString().slice(0, 10) !== dob)
    return fail('DOB_MISMATCH', 'DOCUMENT_DOB_MISMATCH');
  return { status: 'VERIFIED', issue: null };
}

export function evaluateDiditAge(payload: unknown, registeredBirthDate: Date,
  now = new Date()): AgeDecision {
  return evaluateDiditAgeEvidence(payload, registeredBirthDate, now).status;
}
