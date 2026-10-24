import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SETTINGS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64, SETTINGS)) as Buffer;
  return 'scrypt-v1:' + salt + ':' + key.toString('hex');
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [version, salt, encoded] = stored.split(':');
  if (version !== 'scrypt-v1' || !/^[a-f0-9]{32}$/.test(salt ?? '') ||
      !/^[a-f0-9]{128}$/.test(encoded ?? '')) return false;
  const actual = Buffer.from(encoded, 'hex');
  const derived = (await scrypt(password, salt, 64, SETTINGS)) as Buffer;
  return timingSafeEqual(actual, derived);
}
