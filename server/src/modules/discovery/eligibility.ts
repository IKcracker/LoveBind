import type { Gender } from '@prisma/client';

export function age(d: Date, now = new Date()): number {
  let years = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() ||
      (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) years--;
  return years;
}

export function preferenceAccepts(
  p: { minAge: number; maxAge: number; preferredCities: string[]; relationshipGoals: string[]; partnerGenders: Gender[] } | null,
  candidate: { birthDate: Date; city: string | null; relationshipGoal: string | null; gender: Gender | null },
  now = new Date(),
) {
  const years = age(candidate.birthDate, now);
  if (!Number.isFinite(years) || years < 18) return false;
  if (!p) return true;
  return years >= p.minAge && years <= p.maxAge &&
    (!p.partnerGenders.length || candidate.gender !== null && p.partnerGenders.includes(candidate.gender)) &&
    (!p.preferredCities.length || !!candidate.city && p.preferredCities.some(x => x.toLowerCase() === candidate.city!.toLowerCase())) &&
    (!p.relationshipGoals.length || !!candidate.relationshipGoal &&
      p.relationshipGoals.some(x => x.toLowerCase() === candidate.relationshipGoal!.toLowerCase()));
}
