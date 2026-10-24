import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptMessage, encryptMessage } from './message-crypto';

test('encrypts UTF-8 messages with randomized AES-256-GCM nonces', () => {
  const previous=process.env.LOVEBIND_CHAT_ENCRYPTION_KEY;
  try {
    process.env.LOVEBIND_CHAT_ENCRYPTION_KEY='d'.repeat(64);
    const original='I value trust and clear communication ♡';
    const first=encryptMessage(original);
    const second=encryptMessage(original);
    assert.notEqual(first,second);
    assert.ok(!first.includes(original));
    assert.equal(decryptMessage(first),original);
    assert.equal(decryptMessage(second),original);
    const chunks=first.split('.');
    chunks[3]=Buffer.from('tampered').toString('base64url');
    assert.throws(()=>decryptMessage(chunks.join('.')));
  } finally {
    if(previous===undefined)delete process.env.LOVEBIND_CHAT_ENCRYPTION_KEY;
    else process.env.LOVEBIND_CHAT_ENCRYPTION_KEY=previous;
  }
});
test('never falls back to plaintext when the encryption key is missing',()=>{
  const previous=process.env.LOVEBIND_CHAT_ENCRYPTION_KEY;
  try {
    delete process.env.LOVEBIND_CHAT_ENCRYPTION_KEY;
    assert.throws(()=>encryptMessage('secret'));
  } finally {
    if(previous===undefined)delete process.env.LOVEBIND_CHAT_ENCRYPTION_KEY;
    else process.env.LOVEBIND_CHAT_ENCRYPTION_KEY=previous;
  }
});
