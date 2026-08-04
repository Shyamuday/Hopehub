INSERT INTO "PracticeRecommendationRule" (
  "id",
  "practiceId",
  "assessmentType",
  "concernSlug",
  "minScore",
  "maxScore",
  "priority",
  "routineSlot",
  "notes",
  "updatedAt"
) VALUES
  (
    'rule-practice-nadi-shodhana-anxiety-gad7',
    'practice-nadi-shodhana-anxiety',
    'gad7',
    'anxiety',
    5,
    21,
    1,
    'calm-now',
    'Use for mild to severe anxiety if no breathing red flags.',
    NOW()
  ),
  (
    'rule-practice-heartbreak-grounding-yoga-breakup',
    'practice-heartbreak-grounding-yoga',
    'breakup-recovery',
    'breakup',
    61,
    160,
    1,
    'evening',
    'Use when breakup distress or attachment is high.',
    NOW()
  ),
  (
    'rule-practice-dinacharya-sleep-reset-sleep',
    'practice-dinacharya-sleep-reset',
    'sleep',
    'sleep',
    11,
    40,
    1,
    'evening',
    'Use when sleep score suggests moderate difficulty.',
    NOW()
  )
ON CONFLICT ("id") DO NOTHING;
