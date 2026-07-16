// Pure computation, no DB access (same reasoning as pricingEngine.js/warrantyEngine.js)
// — matches the valuation formula frontend/src/data/exchangeMockData.js's mock
// question sets already assume (BACKEND_CONTEXT.md §3.9).

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * questions: ExchangeQuestionSet.questions (each with a `deductions` Map/object
 * of option -> fraction of baseValue to deduct). answers: { [questionText]: selectedOption }.
 * deductionsAmount = sum of deductions[selectedOption] * baseValue for every
 * answered question. estimatedValue = baseValue - deductionsAmount + bonusAmount,
 * floored at 0 (a trade-in can't have negative value).
 */
export function computeExchangeValuation({ baseValue, questions = [], answers = {}, bonusAmount = 0 }) {
  let deductionsAmount = 0;

  for (const question of questions) {
    const selected = answers[question.text];
    if (selected === undefined) continue;

    const deductions = question.deductions instanceof Map ? Object.fromEntries(question.deductions) : question.deductions || {};
    const fraction = deductions[selected];
    if (typeof fraction === 'number') deductionsAmount += fraction * baseValue;
  }

  deductionsAmount = round2(deductionsAmount);
  const estimatedValue = Math.max(0, round2(baseValue - deductionsAmount + bonusAmount));

  return { baseValue, deductionsAmount, bonusAmount, estimatedValue };
}
