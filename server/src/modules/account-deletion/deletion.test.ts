import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDeletion, retentionPolicy } from './deletion-policy';
import { eraseExternal } from './cleanup';

test('deletion requires exact confirmation, a bounded password and no target override', () => {
  for (const input of [null, [], {}, { password: 'x', confirmation: 'delete' },
    { password: 'x'.repeat(129), confirmation: 'DELETE' },
    { password: 'x', confirmation: 'DELETE', userId: 'another-member' }])
    assert.throws(() => parseDeletion(input));
  assert.deepEqual(parseDeletion({ password: '  not-trimmed  ', confirmation: 'DELETE' }), { password: '  not-trimmed  ' });
});

test('production retention is fail-closed and requires explicit approved bounded periods', () => {
  assert.throws(() => retentionPolicy({ NODE_ENV: 'production' }));
  const approved = { NODE_ENV: 'production', LOVEBIND_DELETION_POLICY_APPROVED: 'true',
    LOVEBIND_DELETION_POLICY_VERSION: 'approved-v1', LOVEBIND_DELETION_SAFETY_DAYS: '90',
    LOVEBIND_DELETION_FINANCIAL_DAYS: '365' };
  assert.equal(retentionPolicy(approved).safetyDays, 90);
  for (const invalid of ['0', '-1', '1.5', 'Infinity', '3651'])
    assert.throws(() => retentionPolicy({ ...approved, LOVEBIND_DELETION_SAFETY_DAYS: invalid }));
  assert.equal(retentionPolicy({ NODE_ENV: 'test' }).version, 'test-only');
});

test('provider cleanup accepts deletion or already absent, retries other responses and scopes photo prefix', async () => {
  const original = globalThis.fetch;
  const key = process.env.DIDIT_API_KEY;
  process.env.DIDIT_API_KEY = 'unit-test-only';
  try {
    for (const status of [204, 404, 202, 403, 429, 500]) {
      globalThis.fetch = async (url, init) => {
        assert.equal(url, 'https://verification.didit.me/v3/session/session%2Ftest/delete/');
        assert.equal(init?.method, 'DELETE');
        return new Response(null, { status });
      };
      if ([204, 404].includes(status)) await eraseExternal('DIDIT_SESSION', 'session/test', 'member');
      else await assert.rejects(eraseExternal('DIDIT_SESSION', 'session/test', 'member'));
    }
    await assert.rejects(eraseExternal('PHOTO_PREFIX', 'profiles/another/', 'member'));
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.DIDIT_API_KEY; else process.env.DIDIT_API_KEY = key;
  }
});

test('disposable CI and production migration install identical deletion guards', () => {
  const guards = readFileSync(resolve('prisma/deletion-guards.sql'), 'utf8');
  const migration = readFileSync(resolve('prisma/migrations/20261025_account_deletion/migration.sql'), 'utf8');
  assert.ok(migration.endsWith(guards));
});
