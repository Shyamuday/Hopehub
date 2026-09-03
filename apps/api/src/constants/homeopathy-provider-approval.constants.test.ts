import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX,
  HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX,
  HOMEOPATHY_PROFILE_DRAFT_REASON,
  isHomeopathyApprovalFlowSuspension,
  isHomeopathyCredentialReview,
  isHomeopathyOnboardingSuspension,
  normalizeProfessionalRegistrationNumber
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

test('normalizes professional registration numbers for duplicate protection', () => {
  assert.equal(normalizeProfessionalRegistrationNumber('  MH-123 / 2024 '), 'mh1232024');
  assert.equal(normalizeProfessionalRegistrationNumber('ab'), null);
  assert.equal(normalizeProfessionalRegistrationNumber(null), null);
});

test('ordinary admin suspensions remain hard login blocks', () => {
  assert.equal(isHomeopathyApprovalFlowSuspension('Suspended for a safety review.'), false);
  assert.equal(isHomeopathyApprovalFlowSuspension(null), false);
  for (const approvalStatus of ['DRAFT', 'APPROVED']) {
    assert.equal(
      isHomeopathyOnboardingSuspension({
        providerDomain: 'HOMEOPATHY',
        suspendedAt: new Date(),
        suspendedReason: 'Suspended by admin.',
        approvalStatus
      }),
      false
    );
  }
});

test('only homeopathy credential onboarding locks allow authenticated profile access', () => {
  assert.equal(
    isHomeopathyOnboardingSuspension({
      providerDomain: 'HOMEOPATHY',
      suspendedAt: new Date(),
      suspendedReason: HOMEOPATHY_PROFILE_DRAFT_REASON,
      approvalStatus: 'DRAFT'
    }),
    true
  );
  assert.equal(
    isHomeopathyOnboardingSuspension({
      providerDomain: 'HOMEOPATHY',
      suspendedAt: new Date(),
      approvalStatus: 'CHANGES_REQUESTED'
    }),
    true
  );
  assert.equal(
    isHomeopathyOnboardingSuspension({
      providerDomain: 'HOPE_HUB',
      suspendedAt: new Date(),
      approvalStatus: 'DRAFT'
    }),
    false
  );
});

test('only completed-profile review state is directly approvable', () => {
  assert.equal(isHomeopathyCredentialReview(`${HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX}.`), true);
  assert.equal(isHomeopathyCredentialReview(HOMEOPATHY_PROFILE_DRAFT_REASON), false);
  assert.equal(isHomeopathyCredentialReview(HOMEOPATHY_CREDENTIAL_CHANGES_PREFIX), false);
});
