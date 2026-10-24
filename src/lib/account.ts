import type { Href } from 'expo-router';
import type { CurrentUser, Profile } from './session';

/** Shared by profile intentions and partner preferences, so discovery can match them exactly. */
export const RELATIONSHIP_GOALS = ['Long-term relationship', 'Marriage-minded', 'Getting to know someone', 'Not sure yet'];

/** `waiting` means the member has done their part and LoveBind or Didit is reviewing it. */
export type AccountStep = { key: string; title: string; detail: string; done: boolean; waiting: boolean; href?: Href };

export function profileComplete(profile: Profile | null | undefined): boolean {
  return !!(profile?.city?.trim() && profile.bio?.trim() && profile.relationshipGoal?.trim());
}

export function ageFrom(birthDate: string | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) years--;
  return years;
}

function photoDetail(status: string): string {
  if (status === 'APPROVED') return 'Approved by our trust team.';
  if (status === 'PENDING') return 'Saved privately and awaiting review.';
  if (status === 'REJECTED') return 'Not approved. Please upload a new photo.';
  return 'Add a clear, recent photo of yourself.';
}

/**
 * Mirrors the server's activation rules (server/src/modules/moderation/activation.ts):
 * complete profile, approved photo, Didit identity + adult age evidence, then admin approval.
 */
export function accountProgress(user: CurrentUser) {
  const photoStatus = user.profile?.photoReviewStatus ?? 'NONE';
  const identity = user.identityVerification;
  const identityDone = identity?.status === 'Approved' && identity.ageEvidenceStatus === 'VERIFIED';
  const checksDone = profileComplete(user.profile) && photoStatus === 'APPROVED' && identityDone;
  const steps: AccountStep[] = [
    { key: 'profile', title: 'Your story', done: profileComplete(user.profile), waiting: false, href: '/edit-profile',
      detail: profileComplete(user.profile) ? 'City, intention and introduction added.' : 'Add your city, intention and a short introduction.' },
    { key: 'photo', title: 'Profile photo', done: photoStatus === 'APPROVED', waiting: photoStatus === 'PENDING', href: '/profile-photo', detail: photoDetail(photoStatus) },
    { key: 'identity', title: 'Identity & age', done: identityDone, waiting: !identityDone && identity?.status === 'In Review', href: '/verification',
      detail: identityDone ? 'Verified with Didit.'
        : identity?.status === 'Approved' ? 'Identity approved. Age evidence still needs confirming.'
        : identity && identity.status !== 'Not Started' ? 'Verification status: ' + identity.status + '.'
        : 'A quick ID and selfie check with our partner Didit.' },
    { key: 'review', title: 'Final review', done: user.adminApprovalStatus === 'APPROVED', waiting: checksDone && user.adminApprovalStatus !== 'APPROVED',
      detail: user.adminApprovalStatus === 'APPROVED' ? 'Approved by the LoveBind team.'
        : 'Our team reviews your account once the checks above are complete.' },
  ];
  const completed = steps.filter(step => step.done).length;
  return { steps, completed, total: steps.length, active: user.status === 'ACTIVE', next: steps.find(step => !step.done && !step.waiting && step.href) };
}
