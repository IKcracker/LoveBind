import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

function secret() {
  const value = process.env.LOVEBIND_QUIZ_ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new ServiceUnavailableException('Compatibility quiz is temporarily unavailable');
  }
  return Buffer.from(value, 'hex');
}
export function encryptQuizAnswer(value: number): string {
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',secret(),iv);
  const ciphertext=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);
  return ['qz1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),ciphertext.toString('base64url')].join('.');
}
export function decryptQuizAnswer(payload: string): number {
  const pieces=payload.split('.');
  if(pieces.length!==4 || pieces[0]!=='qz1')
    throw new ServiceUnavailableException('Unsupported quiz answer format');
  const iv=Buffer.from(pieces[1],'base64url'),tag=Buffer.from(pieces[2],'base64url');
  if(iv.length!==12||tag.length!==16)throw new ServiceUnavailableException('Invalid quiz answer format');
  try {
    const decipher=createDecipheriv('aes-256-gcm',secret(),iv);
    decipher.setAuthTag(tag);
    const decoded=Buffer.concat([decipher.update(Buffer.from(pieces[3],'base64url')),decipher.final()]).toString('utf8');
    const answer=Number(decoded);
    if(!Number.isInteger(answer)||answer<1||answer>5)throw new Error('Invalid answer');
    return answer;
  }catch {
    throw new ServiceUnavailableException('Cannot decrypt quiz answer');
  }
}
