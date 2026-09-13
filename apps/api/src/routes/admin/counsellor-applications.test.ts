import assert from 'node:assert/strict';
import test from 'node:test';
import { careContributorServiceScopeForTrack } from './counsellor-applications.js';

test('onboards coach and mentor applications under a non-clinical coaching scope', () => {
  assert.equal(careContributorServiceScopeForTrack('COACH_MENTOR'), 'COACH_MENTORING');
});

test('keeps professional and listener onboarding scopes separate', () => {
  assert.equal(
    careContributorServiceScopeForTrack('PROFESSIONAL_PSYCHOLOGIST'),
    'CLINICAL_PSYCHOLOGY'
  );
  assert.equal(
    careContributorServiceScopeForTrack('PSYCHOLOGY_STUDENT_VOLUNTEER'),
    'SUPERVISED_STUDENT_SUPPORT'
  );
  assert.equal(
    careContributorServiceScopeForTrack('PEER_SUPPORT_VOLUNTEER'),
    'NON_CLINICAL_PEER_SUPPORT'
  );
});
