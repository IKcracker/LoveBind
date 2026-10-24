import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAdultBirthDate, parseEmail, parsePassword, parsePreferences, parseRegistration } from './auth.validation';
import { hashPassword, verifyPassword } from './password';

test('age verification rejects minors and malformed dates', () => {
  assert.throws(() => parseAdultBirthDate('2010-10-24', new Date('2026-10-24T12:00:00Z')));
  assert.equal(parseAdultBirthDate('2008-10-24', new Date('2026-10-24T12:00:00Z')).toISOString().slice(0,10), '2008-10-24');
  assert.throws(() => parseAdultBirthDate('2001-02-29'));
});

test('email normalization and password rules', () => {
  assert.equal(parseEmail(' Person@Example.COM '), 'person@example.com');
  assert.throws(() => parseEmail('not-email'));
  assert.throws(() => parsePassword('12345'));
});

test('preferences enforce age and array limits', () => {
  assert.throws(() => parsePreferences({ minAge: 16, maxAge: 25, preferredCities: [], relationshipGoals: [] }));
  assert.deepEqual(parsePreferences({ minAge: 21, maxAge: 32, preferredCities: ['Johannesburg', 'Johannesburg'], relationshipGoals: [] }).preferredCities, ['Johannesburg']);
});

test('registration requires adult profile fields', () => {
  const x = parseRegistration({ email: 'a@example.com', password: 'quite-long-password', displayName: 'Alex', birthDate: '2000-02-20' });
  assert.equal(x.displayName, 'Alex');
});

test('passwords are salted and verifiable', async () => {
  const first = await hashPassword('a-long-strong-password');
  const second = await hashPassword('a-long-strong-password');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('a-long-strong-password', first), true);
  assert.equal(await verifyPassword('incorrect-password', first), false);
});
