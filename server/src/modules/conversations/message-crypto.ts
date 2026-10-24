import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

function key(): Buffer {
  const raw = process.env.LOVEBIND_CHAT_ENCRYPTION_KEY;
  if (!raw || !/^[a-fA-F0-9]{64}$/.test(raw)) {
    throw new ServiceUnavailableException('Private messages are temporarily unavailable');
  }
  return Buffer.from(raw, 'hex');
}

/** AES-256-GCM encrypted at rest; never logs or returns ciphertext to members. */
export function encryptMessage(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return ['enc1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url')].join('.');
}
export function decryptMessage(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== 'enc1') {
    throw new ServiceUnavailableException('Message content format unsupported');
  }
  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  if (iv.length !== 12 || tag.length !== 16) {
    throw new ServiceUnavailableException('Message content format invalid');
  }
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new ServiceUnavailableException('Unable to read encrypted message');
  }
}
