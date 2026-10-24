import { test } from 'node:test';
import assert from 'node:assert/strict';
import { age, preferenceAccepts } from './eligibility';
import { requiresProfileReview } from '../profiles/approval-policy';
import { parsePreferences, parseProfile } from '../auth/auth.validation';
import { Gender } from '@prisma/client';

const now = new Date('2026-10-24T12:00:00Z');
const profile = { birthDate: new Date('2000-10-24'), city: 'Pretoria', relationshipGoal: 'Long-term', gender: Gender.WOMAN };
const prefs = { minAge: 26, maxAge: 26, preferredCities: ['pretoria'], relationshipGoals: ['long-term'], partnerGenders: [Gender.WOMAN] };

test('age and inclusive preference boundaries use UTC birthdays', () => {
  assert.equal(age(profile.birthDate, now), 26);
  assert.equal(age(new Date('2000-10-25'), now), 25);
  assert.equal(preferenceAccepts(prefs, profile, now), true);
  assert.equal(preferenceAccepts(prefs, { ...profile, birthDate: new Date('2000-10-25') }, now), false);
  assert.equal(preferenceAccepts(prefs, { ...profile, birthDate: new Date('1999-10-24') }, now), false);
});
test('specific preferences exclude unknown or incompatible genders, cities and goals', () => {
  for (const change of [{ gender: null }, { gender: Gender.MAN }, { city: null }, { city: 'Cape Town' }, { relationshipGoal: null }]) {
    assert.equal(preferenceAccepts(prefs, { ...profile, ...change }, now), false);
  }
  assert.equal(preferenceAccepts({ ...prefs, partnerGenders: [] }, { ...profile, gender: null }, now), true);
  assert.equal(preferenceAccepts(null, { ...profile, birthDate: new Date('2010-01-01') }, now), false);
  assert.equal(preferenceAccepts(null, { ...profile, birthDate: new Date('invalid') }, now), false);
});
test('only actual changes to reviewed fields require profile reapproval', () => {
  const current = { displayName: 'Taylor', bio: 'Reading and hiking' };
  assert.equal(requiresProfileReview(current, {}), false);
  assert.equal(requiresProfileReview(current, { ...current }), false);
  assert.equal(requiresProfileReview(current, { displayName: 'Taylor A' }), true);
  assert.equal(requiresProfileReview(current, { bio: null }), true);
});
test('gender validation rejects arbitrary values and preserves omitted preferences', () => {
  assert.throws(() => parseProfile({ gender: 'anything' }));
  assert.equal(parseProfile({ gender: null }).gender, null);
  const input = { minAge: 18, maxAge: 100, preferredCities: [], relationshipGoals: [] };
  assert.equal('partnerGenders' in parsePreferences(input), false);
  assert.throws(() => parsePreferences({ ...input, partnerGenders: 'WOMAN' }));
  assert.throws(() => parsePreferences({ ...input, partnerGenders: ['unknown'] }));
  assert.deepEqual(parsePreferences({ ...input, partnerGenders: ['WOMAN', 'WOMAN'] }).partnerGenders, ['WOMAN']);
});
