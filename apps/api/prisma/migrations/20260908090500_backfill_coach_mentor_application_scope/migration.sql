BEGIN;

UPDATE "CounsellorApplication"
SET "applicationTrack" = 'COACH_MENTOR'
WHERE "careTeamType" IN (
  'NLP_COACH',
  'LIFE_COACH',
  'MEDITATION_BREATHWORK_GUIDE',
  'CAREER_STUDY_MENTOR'
);

UPDATE "CareContributor"
SET "applicationTrack" = 'COACH_MENTOR',
    "serviceScope" = 'COACH_MENTORING',
    "credentialVerificationStatus" = 'NOT_REQUIRED'
WHERE "careTeamType" IN (
  'NLP_COACH',
  'LIFE_COACH',
  'MEDITATION_BREATHWORK_GUIDE',
  'CAREER_STUDY_MENTOR'
);

COMMIT;
