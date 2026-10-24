import { BadRequestException } from '@nestjs/common';

type Input = Record<string, unknown>;
function record(value: unknown): Input {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('A JSON object is required');
  }
  return value as Input;
}
export function requiredText(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new BadRequestException(field + ' must be text');
  const text = value.trim();
  if (text.length < min || text.length > max) {
    throw new BadRequestException(field + ' must be ' + min + '-' + max + ' characters');
  }
  return text;
}
export function optionalText(value: unknown, field: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return requiredText(value, field, 1, max);
}
export function parseEmail(value: unknown): string {
  const email = requiredText(value, 'email', 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('A valid email address is required');
  }
  return email;
}
export function parsePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) {
    throw new BadRequestException('Password must be 12-128 characters');
  }
  return value;
}
export function parseAdultBirthDate(value: unknown, now = new Date()): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('birthDate must use YYYY-MM-DD');
  }
  const date = new Date(value + 'T00:00:00.000Z');
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('Invalid birth date');
  }
  const y = now.getUTCFullYear() - date.getUTCFullYear();
  const m = now.getUTCMonth() - date.getUTCMonth();
  const d = now.getUTCDate() - date.getUTCDate();
  if (y < 18 || (y === 18 && (m < 0 || (m === 0 && d < 0))) || y > 115) {
    throw new BadRequestException('LoveBind registration is available to adults aged 18+');
  }
  return date;
}
export function parseRegistration(value: unknown) {
  const body = record(value);
  return {
    email: parseEmail(body.email),
    password: parsePassword(body.password),
    displayName: requiredText(body.displayName, 'displayName', 2, 60),
    birthDate: parseAdultBirthDate(body.birthDate),
  };
}
export function parseLogin(value: unknown) {
  const body = record(value);
  return { email: parseEmail(body.email), password: requiredText(body.password, 'password', 1, 128) };
}
export function parseProfile(value: unknown) {
  const body = record(value);
  return {
    ...(body.displayName === undefined ? {} : { displayName: requiredText(body.displayName, 'displayName', 2, 60) }),
    ...(body.city === undefined ? {} : { city: optionalText(body.city, 'city', 100) }),
    ...(body.bio === undefined ? {} : { bio: optionalText(body.bio, 'bio', 1000) }),
    ...(body.relationshipGoal === undefined ? {} : { relationshipGoal: optionalText(body.relationshipGoal, 'relationshipGoal', 80) }),
  };
}
export function parsePreferences(value: unknown) {
  const body = record(value);
  const { minAge, maxAge, preferredCities, relationshipGoals } = body;
  if (!Number.isInteger(minAge) || !Number.isInteger(maxAge) ||
      (minAge as number) < 18 || (maxAge as number) > 100 || (minAge as number) > (maxAge as number)) {
    throw new BadRequestException('Age range must satisfy 18 <= minAge <= maxAge <= 100');
  }
  const parseArray = (input: unknown, field: string, cap: number) => {
    if (!Array.isArray(input) || input.length > cap ||
        input.some((x) => typeof x !== 'string' || x.trim().length === 0 || x.trim().length > 80)) {
      throw new BadRequestException(field + ' must be a list of up to ' + cap + ' short strings');
    }
    return [...new Set((input as string[]).map((x) => x.trim()))];
  };
  return {
    minAge: minAge as number,
    maxAge: maxAge as number,
    preferredCities: parseArray(preferredCities, 'preferredCities', 10),
    relationshipGoals: parseArray(relationshipGoals, 'relationshipGoals', 5),
  };
}
