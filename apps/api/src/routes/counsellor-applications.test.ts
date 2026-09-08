import assert from 'node:assert/strict';
import test from 'node:test';
import { counsellorApplicationSchema } from './counsellor-applications.js';

const baseApplication = {
  fullName: 'Example Applicant',
  email: 'applicant@example.com',
  phone: '+919876543210',
  city: 'Delhi',
  languages: 'Hindi, English',
  availability: 'Weekday evenings',
  preferredChannel: 'telegram' as const,
  whyJoin: 'I want to support the Hope Hub community with a calm, ethical, and reliable approach.'
};

test('accepts a coach under the coach and mentor pathway', () => {
  const result = counsellorApplicationSchema.safeParse({
    ...baseApplication,
    applicationTrack: 'COACH_MENTOR',
    careTeamType: 'LIFE_COACH',
    qualification: 'Certified life-coaching programme',
    specialization: 'Life direction',
    experienceYears: '1-3 years',
    resumeLink: 'https://example.com/profile',
    agreesToNonClinicalRole: true
  });

  assert.equal(result.success, true);
});

test('rejects a coach submitted through the clinical pathway', () => {
  const result = counsellorApplicationSchema.safeParse({
    ...baseApplication,
    applicationTrack: 'PROFESSIONAL_PSYCHOLOGIST',
    careTeamType: 'LIFE_COACH',
    qualification: 'Certified life-coaching programme',
    specialization: 'Life direction',
    experienceYears: '1-3 years',
    resumeLink: 'https://example.com/profile',
    agreesToNonClinicalRole: true
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues.some((issue) => issue.path[0] === 'applicationTrack'),
      true
    );
  }
});

test('enforces the non-clinical agreement for coaches and mentors', () => {
  const result = counsellorApplicationSchema.safeParse({
    ...baseApplication,
    applicationTrack: 'COACH_MENTOR',
    careTeamType: 'CAREER_STUDY_MENTOR',
    qualification: 'Career mentoring certificate',
    specialization: 'Career direction',
    experienceYears: '1-3 years',
    resumeLink: 'https://example.com/profile',
    agreesToNonClinicalRole: false
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues.some((issue) => issue.path[0] === 'agreesToNonClinicalRole'),
      true
    );
  }
});

test('requires professional credentials for qualified clinical roles', () => {
  const result = counsellorApplicationSchema.safeParse({
    ...baseApplication,
    applicationTrack: 'PROFESSIONAL_PSYCHOLOGIST',
    careTeamType: 'QUALIFIED_COUNSELLOR',
    qualification: 'MA Counselling Psychology',
    specialization: 'Anxiety and stress',
    experienceYears: '1-3 years',
    resumeLink: 'https://example.com/profile',
    registrationDetails: ''
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues.some((issue) => issue.path[0] === 'registrationDetails'),
      true
    );
  }
});
