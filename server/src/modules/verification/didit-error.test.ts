import assert from 'node:assert/strict';
import test from 'node:test';
import { diditFailure, hostedDiditUrl } from './didit-error';

test('Didit upstream statuses have specific safe diagnostics', () => {
  assert.equal(diditFailure(401).code, 'DIDIT_KEY_REJECTED');
  assert.equal(diditFailure(403).code, 'DIDIT_PERMISSION_DENIED');
  assert.equal(diditFailure(404).code, 'DIDIT_WORKFLOW_NOT_FOUND');
  assert.equal(diditFailure(402).code, 'DIDIT_INSUFFICIENT_CREDITS');
  assert.equal(diditFailure(422).code, 'DIDIT_REQUEST_REJECTED');
  assert.equal(diditFailure(429).code, 'DIDIT_RATE_LIMIT');
  assert.equal(diditFailure(503).code, 'DIDIT_UPSTREAM_ERROR');
});

test('only HTTPS Didit links may be returned to the device', () => {
  assert.equal(hostedDiditUrl('https://verify.didit.me/session/example'), 'https://verify.didit.me/session/example');
  assert.equal(hostedDiditUrl('https://didit.me/verification/example'), 'https://didit.me/verification/example');
  assert.equal(hostedDiditUrl('verify.didit.me/?session_token=test'), 'https://verify.didit.me/?session_token=test');
  assert.equal(hostedDiditUrl('https://evil-didit.me/'), null);
  assert.equal(hostedDiditUrl('https://didit.me.evil.example/'), null);
  assert.equal(hostedDiditUrl('http://verify.didit.me/session/example'), null);
  assert.equal(hostedDiditUrl('https://user:pass@verify.didit.me/'), null);
  assert.equal(hostedDiditUrl(null), null);
});
