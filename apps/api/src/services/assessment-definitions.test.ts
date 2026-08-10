import assert from 'node:assert/strict';
import test from 'node:test';
import {
  scoreAssessment,
  validateAssessmentConfig,
  type AssessmentDefinitionRecord
} from './assessment-definitions.js';
import { enrichAssessmentIntroMetadata } from './assessment-intro-metadata.js';

const definition: AssessmentDefinitionRecord = {
  id: 'sample-test',
  type: 'Sample',
  category: 'General',
  title: 'Sample Test',
  description: 'A sample assessment for backend scoring.',
  version: 'v2',
  accessMode: 'FREE',
  priceInPaise: null,
  couponCode: null,
  couponLabel: null,
  couponDiscountType: 'FREE',
  couponDiscountValue: null,
  couponStartsAt: null,
  couponEndsAt: null,
  couponMaxRedemptions: null,
  accessNote: null,
  isActive: true,
  sortOrder: 0,
  config: {
    id: 'sample-test',
    type: 'Sample',
    category: 'General',
    title: 'Sample Test',
    description: 'A sample assessment for backend scoring.',
    instructions: 'Answer honestly.',
    duration: '1 minute',
    questions: [
      { id: 1, text: 'First question' },
      { id: 2, text: 'Second question' }
    ],
    responseOptions: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Sometimes' },
      { value: 2, label: 'Yes' }
    ],
    scoring: [
      {
        min: 0,
        max: 1,
        level: 'Low',
        color: 'green',
        description: 'Low score.',
        suggestions: ['Keep going']
      },
      {
        min: 2,
        max: 4,
        level: 'High',
        color: 'red',
        description: 'High score.',
        suggestions: ['Get support']
      }
    ],
    disclaimer: 'Education only.',
    emergencyHelplines: [],
    safetyQuestionIndex: 1
  }
};

test('scoreAssessment calculates total, band, max score, safety, and version from backend definition', () => {
  const result = scoreAssessment(definition, [1, 2]);
  assert.equal(result.total, 3);
  assert.equal(result.maxScore, 4);
  assert.equal(result.level, 'High');
  assert.equal(result.version, 'v2');
  assert.equal(result.safetyFlag, true);
});

test('scoreAssessment rejects answers that do not match response options', () => {
  assert.throws(() => scoreAssessment(definition, [1, 9]), /valid response option/);
});

test('validateAssessmentConfig catches broken definitions before publish', () => {
  const errors = validateAssessmentConfig({
    ...definition.config,
    questions: [{ id: 1, text: '' }],
    responseOptions: [{ value: 0, label: 'No' }]
  });
  assert(errors.some((error) => error.includes('text is required')));
  assert(errors.some((error) => error.includes('At least two response options')));
});

test('enrichAssessmentIntroMetadata adds backend-driven intro metadata by category', () => {
  const enriched = enrichAssessmentIntroMetadata({
    ...definition.config,
    id: 'gad7',
    category: 'Anxiety'
  });

  assert(enriched.whoShouldTake?.some((item) => item.includes('worried')));
  assert(enriched.possibleSymptoms?.some((item) => item.includes('worry')));
  assert(enriched.whatThisTestChecks?.some((item) => item.includes('Seven common anxiety')));
  assert(enriched.beforeYouStart?.length);
  assert.equal(enriched.disclaimer, definition.config.disclaimer);
});
