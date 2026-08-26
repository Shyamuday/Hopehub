import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX,
  HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX,
  HOMEOPATHY_PROFILE_DRAFT_REASON,
  isHomeopathyApprovalFlowSuspension,
  isHomeopathyCredentialReview
} from './homeopathy-provider-approval.constants.js';

test('homeopathy onboarding and review states allow profile completion login', () => {
  assert.equal(isHomeopathyApprovalFlowSuspension(HOMEOPATHY_PROFILE_DRAFT_REASON), true);
  assert.equal(isHomeopathyApprovalFlowSuspension(`${HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX}.`), true);
  assert.equal(
    isHomeopathyApprovalFlowSuspension(
      `${HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX}: upload a clearer certificate`
    ),
    true
  );
});

test('ordinary admin suspensions remain hard login blocks', () => {
  assert.equal(isHomeopathyApprovalFlowSuspension('Suspended for a safety review.'), false);
  assert.equal(isHomeopathyApprovalFlowSuspension(null), false);
});

test('only completed-profile review state is directly approvable', () => {
  assert.equal(isHomeopathyCredentialReview(`${HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX}.`), true);
  assert.equal(isHomeopathyCredentialReview(HOMEOPATHY_PROFILE_DRAFT_REASON), false);
  assert.equal(isHomeopathyCredentialReview(HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX), false);
});
