import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SETTINGS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, SETTINGS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return 'scrypt-v1:' + salt + ':' + key.toString('hex');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [version, salt, encoded] = stored.split(':');
  if (version !== 'scrypt-v1' || !/^[a-f0-9]{32}$/.test(salt ?? '') ||
      !/^[a-f0-9]{128}$/.test(encoded ?? '')) return false;
  const actual = Buffer.from(encoded, 'hex');
  const derived = await derive(password, salt);
  return timingSafeEqual(actual, derived);
}
