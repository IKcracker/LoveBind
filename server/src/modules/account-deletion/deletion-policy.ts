import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

export function parseDeletion(input: unknown): { password: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Confirm account deletion');
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(k => !['password', 'confirmation'].includes(k)) ||
      data.confirmation !== 'DELETE' || typeof data.password !== 'string' ||
      data.password.length < 1 || data.password.length > 128)
    throw new BadRequestException('Enter your current password and type DELETE');
  return { password: data.password };
}

export function retentionPolicy(env: NodeJS.ProcessEnv = process.env) {
  const test = env.NODE_ENV === 'test';
  const safetyDays = Number(env.LOVEBIND_DELETION_SAFETY_DAYS ?? (test ? 30 : NaN));
  const financialDays = Number(env.LOVEBIND_DELETION_FINANCIAL_DAYS ?? (test ? 30 : NaN));
  const version = env.LOVEBIND_DELETION_POLICY_VERSION ?? (test ? 'test-only' : '');
  if ((!test && env.LOVEBIND_DELETION_POLICY_APPROVED !== 'true') ||
      !/^[a-zA-Z0-9_.-]{1,80}$/.test(version) ||
      ![safetyDays, financialDays].every(n => Number.isInteger(n) && n >= 1 && n <= 3650))
    throw new ServiceUnavailableException('Account deletion policy is awaiting release approval');
  return { safetyDays, financialDays, version };
}
