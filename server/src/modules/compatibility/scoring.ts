/**
 * LoveBind mutual compatibility scoring v1. This is a questionnaire-alignment
 * indicator, NOT a prediction of relationship success or an AI safety verdict.
 * Model outputs must be validated before being passed to this pure function.
 */

export const CATEGORY_WEIGHTS = {
  RELATIONSHIP_INTENT: 20,
  VALUES: 20,
  LIFESTYLE: 15,
  COMMUNICATION: 15,
  CONFLICT_RESOLUTION: 10,
  FUTURE_GOALS: 10,
  PRACTICAL: 10,
} as const;

export type Category = keyof typeof CATEGORY_WEIGHTS;
export type CategoryRating = {
  category: Category;
  aToB: number;
  bToA: number;
};

export type CompatibilityResult = {
  score: number;
  recommendation: 'EXPLORE_FURTHER' | 'PROMISING' | 'STRONG' | 'EXCEPTIONAL';
  suggestedCredits: 3 | 6 | 10;
  rubricVersion: '1.0';
};

function assertRating(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError('Category ratings must be finite numbers between 0 and 100');
  }
}

export function calculateMutualCompatibility(
  ratings: readonly CategoryRating[],
): CompatibilityResult {
  const categories = Object.keys(CATEGORY_WEIGHTS) as Category[];
  if (ratings.length !== categories.length) {
    throw new Error('One valid score is required for each compatibility category');
  }
  const provided = new Map<Category, CategoryRating>();
  for (const rating of ratings) {
    if (!Object.prototype.hasOwnProperty.call(CATEGORY_WEIGHTS, rating.category)) {
      throw new Error('Unknown category');
    }
    if (provided.has(rating.category)) {
      throw new Error('Duplicate category');
    }
    assertRating(rating.aToB);
    assertRating(rating.bToA);
    provided.set(rating.category, rating);
  }
  if (categories.some((category) => !provided.has(category))) {
    throw new Error('Missing category');
  }
  // Geometric mean penalizes a poor one-sided fit.
  const score = Math.round(categories.reduce((sum, category) => {
    const rating = provided.get(category)!;
    const symmetric = Math.sqrt(rating.aToB * rating.bToA);
    return sum + symmetric * CATEGORY_WEIGHTS[category] / 100;
  }, 0));

  if (score >= 90) {
    return { score, recommendation: 'EXCEPTIONAL', suggestedCredits: 10, rubricVersion: '1.0' };
  }
  if (score >= 75) {
    return { score, recommendation: 'STRONG', suggestedCredits: 6, rubricVersion: '1.0' };
  }
  return {
    score,
    recommendation: score >= 60 ? 'PROMISING' : 'EXPLORE_FURTHER',
    suggestedCredits: 3,
    rubricVersion: '1.0',
  };
}
