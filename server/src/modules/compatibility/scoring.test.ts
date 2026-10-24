import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateMutualCompatibility, CATEGORY_WEIGHTS, CategoryRating } from './scoring';

const categories = Object.keys(CATEGORY_WEIGHTS) as CategoryRating['category'][];
const ratings = (a: number, b: number): CategoryRating[] =>
  categories.map((category) => ({ category, aToB: a, bToA: b }));

test('perfect mutual alignment recommends 10 credits', () => {
  assert.deepEqual(calculateMutualCompatibility(ratings(100, 100)), {
    score: 100, recommendation: 'EXCEPTIONAL', suggestedCredits: 10, rubricVersion: '1.0'
  });
});

test('one-sided incompatibility does not yield an inflated score', () => {
  const outcome = calculateMutualCompatibility(ratings(100, 0));
  assert.equal(outcome.score, 0);
  assert.equal(outcome.recommendation, 'EXPLORE_FURTHER');
});

test('solid alignment receives the strong tier', () => {
  const outcome = calculateMutualCompatibility(ratings(80, 80));
  assert.equal(outcome.score, 80);
  assert.equal(outcome.suggestedCredits, 6);
});

test('out-of-range and non-finite values are rejected', () => {
  assert.throws(() => calculateMutualCompatibility(ratings(101, 90)), RangeError);
  assert.throws(() => calculateMutualCompatibility(ratings(Number.NaN, 90)), RangeError);
});

test('missing and duplicate categories are rejected', () => {
  assert.throws(() => calculateMutualCompatibility(ratings(90, 90).slice(1)));
  const duplicate = ratings(90, 90);
  duplicate[1] = duplicate[0];
  assert.throws(() => calculateMutualCompatibility(duplicate));
});
