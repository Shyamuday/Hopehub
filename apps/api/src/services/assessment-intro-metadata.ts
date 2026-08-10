type AssessmentIntroMetadata = {
  whoShouldTake: string[];
  possibleSymptoms: string[];
  whatThisTestChecks: string[];
  beforeYouStart: string[];
  disclaimer: string;
};

type AssessmentConfigLike = {
  id?: unknown;
  type?: unknown;
  category?: unknown;
  title?: unknown;
  description?: unknown;
  instructions?: unknown;
  disclaimer?: unknown;
  whoShouldTake?: unknown;
  possibleSymptoms?: unknown;
  whatThisTestChecks?: unknown;
  beforeYouStart?: unknown;
  access?: unknown;
};

const GENERAL_DISCLAIMER =
  'This self-check is for education and reflection only. It is not a diagnosis, medical advice, or a substitute for care from a qualified professional. If you feel unsafe, at risk of harming yourself, or unable to stay safe, contact emergency services or a crisis helpline immediately.';

const CATEGORY_METADATA: Record<string, AssessmentIntroMetadata> = {
  Depression: {
    whoShouldTake: [
      'People feeling low, empty, hopeless, or emotionally numb for several days or more.',
      'People who have lost interest in things they usually enjoy.',
      'People noticing changes in sleep, appetite, energy, concentration, or self-worth.'
    ],
    possibleSymptoms: [
      'Low mood, sadness, emptiness, or hopelessness.',
      'Loss of interest, tiredness, poor sleep, appetite changes, or difficulty focusing.',
      'Feeling worthless, guilty, slowed down, restless, or having thoughts of self-harm.'
    ],
    whatThisTestChecks: [
      'Frequency and intensity of common depression-related experiences.',
      'How symptoms may be affecting mood, energy, sleep, appetite, and daily functioning.',
      'Whether your answers suggest low, mild, moderate, or higher support needs.'
    ],
    beforeYouStart: [
      'Answer based on the timeframe shown for the test, usually the past two weeks.',
      'Choose what is most true overall, not just how you feel in this exact moment.',
      'If you mark self-harm thoughts, please reach out for immediate human support.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Anxiety: {
    whoShouldTake: [
      'People who often feel worried, tense, nervous, or on edge.',
      'People who find it hard to stop worrying or relax.',
      'People whose anxiety is affecting sleep, work, study, relationships, or daily life.'
    ],
    possibleSymptoms: [
      'Excessive worry, racing thoughts, fear that something bad may happen.',
      'Restlessness, irritability, difficulty relaxing, or trouble concentrating.',
      'Physical tension, disturbed sleep, fast heartbeat, or feeling overwhelmed.'
    ],
    whatThisTestChecks: [
      'How often anxiety-related symptoms have been present recently.',
      'Patterns of worry, restlessness, fear, relaxation difficulty, and irritability.',
      'Whether your score suggests mild, moderate, or stronger anxiety support needs.'
    ],
    beforeYouStart: [
      'Answer honestly based on the test timeframe, not what you think the answer should be.',
      'This is a screening tool, not a diagnosis of an anxiety disorder.',
      'If symptoms feel sudden, severe, or medical, seek medical advice urgently.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Stress: {
    whoShouldTake: [
      'People feeling overloaded, pressured, or unable to cope with daily demands.',
      'People noticing stress from work, study, family, finances, health, or uncertainty.',
      'People wanting a quick view of how stress is affecting their wellbeing.'
    ],
    possibleSymptoms: [
      'Feeling unable to control important things or handle responsibilities.',
      'Irritability, tension, fatigue, sleep changes, headaches, or body tightness.',
      'Difficulty concentrating, feeling rushed, or constantly being on alert.'
    ],
    whatThisTestChecks: [
      'Perceived stress and coping pressure.',
      'How manageable life has felt recently.',
      'Whether stress support, pacing, rest, or professional help may be useful.'
    ],
    beforeYouStart: [
      'Think about your recent overall stress pattern.',
      'There are no right or wrong answers.',
      'If stress is linked to safety, violence, or crisis, seek immediate support.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  'Well-being': {
    whoShouldTake: [
      'People wanting to understand their current emotional wellbeing.',
      'People tracking mood, energy, interest, and daily functioning over time.',
      'People who do not feel “ill” but want to check how they are doing.'
    ],
    possibleSymptoms: [
      'Low motivation, reduced enjoyment, or feeling emotionally flat.',
      'Poor energy, disturbed sleep, low confidence, or difficulty feeling calm.',
      'A general sense that life feels heavy, dull, or disconnected.'
    ],
    whatThisTestChecks: [
      'Positive wellbeing, mood, vitality, interest, and daily balance.',
      'Whether your current wellbeing looks strong, reduced, or needs attention.',
      'A simple baseline you can compare with future retests.'
    ],
    beforeYouStart: [
      'Answer from your lived experience, not how you want things to be.',
      'Use the result as a reflection point, not a label.',
      'If your wellbeing feels very low, consider talking to a trusted person or professional.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Combined: {
    whoShouldTake: [
      'People unsure whether they are dealing with stress, anxiety, low mood, or a mix.',
      'People wanting a broader emotional health snapshot.',
      'People who want one combined test before choosing support.'
    ],
    possibleSymptoms: [
      'Low mood, worry, tension, irritability, fatigue, or poor sleep.',
      'Loss of interest, nervousness, panic-like feelings, or trouble relaxing.',
      'Feeling overwhelmed across work, study, relationships, or daily life.'
    ],
    whatThisTestChecks: [
      'Depression, anxiety, and stress patterns together.',
      'Which area may need the most attention right now.',
      'A broad screening result to guide next steps and support options.'
    ],
    beforeYouStart: [
      'Answer each item based on recent experience.',
      'The result can show patterns, but it does not diagnose a condition.',
      'If any answer points to immediate danger, prioritize urgent support.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Burnout: {
    whoShouldTake: [
      'People feeling emotionally drained from work, caregiving, study, or responsibility.',
      'People who feel detached, cynical, ineffective, or constantly exhausted.',
      'People wanting to understand if rest alone is not fixing the fatigue.'
    ],
    possibleSymptoms: [
      'Emotional exhaustion, irritability, low motivation, or dread before tasks.',
      'Feeling detached from work, study, care duties, or people.',
      'Reduced performance, brain fog, sleep issues, or ongoing fatigue.'
    ],
    whatThisTestChecks: [
      'Burnout-related exhaustion, detachment, and reduced effectiveness.',
      'How pressure may be affecting energy, meaning, and performance.',
      'Whether boundaries, recovery, workload changes, or support may help.'
    ],
    beforeYouStart: [
      'Think about your recent work, study, or responsibility load.',
      'Answer based on patterns, not one unusually hard day.',
      'If exhaustion is severe or medical symptoms are present, consider medical advice.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Sleep: {
    whoShouldTake: [
      'People struggling with falling asleep, staying asleep, or waking tired.',
      'People whose mood, anxiety, or energy may be affected by sleep quality.',
      'People wanting a quick snapshot before improving sleep habits.'
    ],
    possibleSymptoms: [
      'Difficulty falling asleep, waking often, early waking, or oversleeping.',
      'Daytime tiredness, poor focus, irritability, or low motivation.',
      'Restless nights, racing thoughts, nightmares, or non-refreshing sleep.'
    ],
    whatThisTestChecks: [
      'Sleep quality, restfulness, and sleep-related daytime impact.',
      'Whether sleep difficulties look mild, moderate, or more disruptive.',
      'Areas where sleep routine or support may be useful.'
    ],
    beforeYouStart: [
      'Answer based on your usual recent sleep pattern.',
      'This is not a medical sleep-disorder diagnosis.',
      'Seek medical help for breathing pauses, chest pain, severe insomnia, or sudden sleep attacks.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Relationship: {
    whoShouldTake: [
      'People feeling stuck, hurt, distant, or confused in a relationship.',
      'People facing repeated conflict, trust issues, communication problems, or loneliness.',
      'People wanting to reflect before choosing counselling, coaching, or support.'
    ],
    possibleSymptoms: [
      'Frequent arguments, emotional distance, anxiety, jealousy, or trust concerns.',
      'Feeling unheard, unsafe, controlled, rejected, or unable to express needs.',
      'Breakup thoughts, attachment anxiety, resentment, or difficulty setting boundaries.'
    ],
    whatThisTestChecks: [
      'Relationship stress, communication, trust, emotional safety, and support.',
      'Whether concerns may benefit from reflection, boundaries, or professional support.',
      'Patterns that may guide the next conversation or session.'
    ],
    beforeYouStart: [
      'Answer for the relationship that is currently affecting you most.',
      'If there is abuse, coercion, or physical danger, prioritize safety planning.',
      'This test is reflective and does not decide whether you should stay or leave.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  'Breakup Recovery': {
    whoShouldTake: [
      'People recovering from a breakup, separation, rejection, or relationship loss.',
      'People feeling stuck in grief, rumination, anger, guilt, or longing.',
      'People wanting guidance on healing pace and support needs.'
    ],
    possibleSymptoms: [
      'Crying, numbness, loneliness, rumination, or urge to contact the ex-partner.',
      'Sleep/appetite changes, low self-worth, anger, guilt, or intrusive memories.',
      'Difficulty functioning, social withdrawal, or fear of being alone.'
    ],
    whatThisTestChecks: [
      'Emotional recovery, attachment pain, daily functioning, and support needs.',
      'Whether breakup distress is easing or still highly active.',
      'Next steps for self-care, boundaries, and emotional support.'
    ],
    beforeYouStart: [
      'Answer based on your current recovery, not only the breakup day.',
      'Healing is not linear; this test is a check-in, not a judgment.',
      'If you feel unsafe or hopeless, seek immediate support.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Panic: {
    whoShouldTake: [
      'People experiencing sudden intense fear, panic waves, or body alarm symptoms.',
      'People worried about panic attacks or fear of another episode.',
      'People who want to understand panic-like symptoms before seeking support.'
    ],
    possibleSymptoms: [
      'Racing heart, shortness of breath, dizziness, trembling, sweating, or chest tightness.',
      'Fear of dying, losing control, fainting, or “going crazy”.',
      'Avoiding places or situations because of fear of panic.'
    ],
    whatThisTestChecks: [
      'Panic-like body sensations, fear patterns, and avoidance.',
      'How much panic symptoms may be affecting daily life.',
      'Whether grounding, anxiety support, or clinical evaluation may help.'
    ],
    beforeYouStart: [
      'If chest pain, fainting, breathing difficulty, or new severe symptoms are present, seek medical care.',
      'Answer based on recent panic-like episodes.',
      'This test cannot rule out medical causes.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  'Social Anxiety': {
    whoShouldTake: [
      'People who fear judgement, embarrassment, rejection, or being watched.',
      'People avoiding social, work, school, or public situations because of anxiety.',
      'People wanting to understand social confidence and avoidance patterns.'
    ],
    possibleSymptoms: [
      'Fear of speaking, meeting people, eating in public, calls, interviews, or groups.',
      'Blushing, shaking, sweating, blanking out, or replaying interactions.',
      'Avoidance, over-preparing, people pleasing, or strong fear of criticism.'
    ],
    whatThisTestChecks: [
      'Social fear, avoidance, self-consciousness, and impact on daily life.',
      'Whether your pattern may benefit from gradual exposure or support.',
      'Areas where confidence-building or counselling may help.'
    ],
    beforeYouStart: [
      'Think about typical social situations, not only one event.',
      'Answer based on fear and avoidance, not personality style.',
      'This test is not a formal diagnosis of social anxiety disorder.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Loneliness: {
    whoShouldTake: [
      'People feeling emotionally alone even when others are around.',
      'People lacking safe people to talk to, share with, or feel understood by.',
      'People wanting to understand connection needs and support options.'
    ],
    possibleSymptoms: [
      'Feeling isolated, unseen, unsupported, disconnected, or left out.',
      'Low motivation to reach out, fear of bothering others, or social withdrawal.',
      'Sadness, emptiness, comparison, or craving meaningful conversation.'
    ],
    whatThisTestChecks: [
      'Emotional connection, perceived support, belonging, and isolation.',
      'How loneliness may be affecting mood and daily life.',
      'Whether listener support, community, or counselling may help.'
    ],
    beforeYouStart: [
      'Answer from your felt sense of connection, not only number of contacts.',
      'Loneliness is common and does not mean something is wrong with you.',
      'If loneliness comes with self-harm thoughts, seek immediate support.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  'Self-Esteem': {
    whoShouldTake: [
      'People struggling with self-worth, confidence, shame, or harsh self-criticism.',
      'People who often compare themselves or feel “not good enough”.',
      'People wanting to understand self-belief before coaching or counselling.'
    ],
    possibleSymptoms: [
      'Negative self-talk, fear of failure, people pleasing, or difficulty accepting praise.',
      'Avoiding opportunities, over-apologizing, or feeling undeserving.',
      'Shame, comparison, perfectionism, or sensitivity to criticism.'
    ],
    whatThisTestChecks: [
      'Self-worth, confidence, self-acceptance, and inner criticism.',
      'How self-esteem may be affecting choices, relationships, and growth.',
      'Whether coaching, support, or therapy-style work may help.'
    ],
    beforeYouStart: [
      'Answer honestly; low self-esteem can improve with support and practice.',
      'This test is a reflection tool, not a personality label.',
      'If shame feels overwhelming, consider talking to someone safe.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Anger: {
    whoShouldTake: [
      'People who feel anger is becoming hard to control or recover from.',
      'People having conflicts, regret, guilt, or shutdown after anger episodes.',
      'People wanting to understand triggers and regulation needs.'
    ],
    possibleSymptoms: [
      'Frequent irritability, shouting, sarcasm, aggression, or silent withdrawal.',
      'Body tension, racing thoughts, impulsive reactions, or later regret.',
      'Relationship strain, work/study impact, or fear of losing control.'
    ],
    whatThisTestChecks: [
      'Anger intensity, triggers, expression, recovery, and impact.',
      'Whether regulation skills, boundaries, or professional support may help.',
      'Patterns that can guide calmer response planning.'
    ],
    beforeYouStart: [
      'Answer based on your usual anger pattern recently.',
      'If there is risk of violence or harm, create distance and seek urgent support.',
      'This test does not excuse harmful behaviour; it helps identify support needs.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  },
  Grief: {
    whoShouldTake: [
      'People grieving a death, relationship loss, life change, or major emotional loss.',
      'People feeling stuck in sadness, guilt, anger, numbness, or longing.',
      'People wanting to understand whether grief support may help.'
    ],
    possibleSymptoms: [
      'Waves of sadness, numbness, yearning, guilt, anger, or disbelief.',
      'Sleep/appetite changes, low energy, withdrawal, or difficulty functioning.',
      'Feeling life has changed permanently or struggling with reminders.'
    ],
    whatThisTestChecks: [
      'Grief intensity, adjustment, daily functioning, and support needs.',
      'Whether grief looks within expected waves or feels stuck/overwhelming.',
      'Next steps for gentle support, rituals, connection, and care.'
    ],
    beforeYouStart: [
      'Answer gently; grief can move in waves and does not follow a fixed timeline.',
      'Use the result as a support guide, not a judgment of your healing.',
      'If grief includes thoughts of self-harm, seek immediate support.'
    ],
    disclaimer: GENERAL_DISCLAIMER
  }
};

const ID_OVERRIDES: Record<string, Partial<AssessmentIntroMetadata>> = {
  phq9: {
    whatThisTestChecks: [
      'Nine common depression symptoms from the past two weeks.',
      'Mood, interest, sleep, energy, appetite, self-worth, concentration, movement, and safety.',
      'A severity range that can help decide whether self-care, counselling, or urgent support is needed.'
    ]
  },
  phq2: {
    whatThisTestChecks: [
      'Two quick depression screening questions from the PHQ-9.',
      'Low interest/pleasure and feeling down or hopeless.',
      'Whether a full depression assessment may be useful.'
    ]
  },
  gad7: {
    whatThisTestChecks: [
      'Seven common anxiety symptoms from the past two weeks.',
      'Worry, nervousness, relaxation difficulty, restlessness, irritability, and fear.',
      'A severity range that can help guide anxiety support options.'
    ]
  },
  dass21: {
    whatThisTestChecks: [
      'Depression, anxiety, and stress symptoms together.',
      'Mood, body anxiety, tension, overwhelm, and emotional strain.',
      'Which support area may need attention first.'
    ]
  }
};

function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function firstNonEmptyArray(...values: unknown[]): string[] {
  for (const value of values) {
    const arr = textArray(value);
    if (arr.length) return arr;
  }
  return [];
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text) return text;
  }
  return '';
}

export function enrichAssessmentIntroMetadata<T extends AssessmentConfigLike>(config: T): T {
  const category = firstText(config.category);
  const id = firstText(config.id).toLowerCase();
  const fallback = CATEGORY_METADATA[category] ?? CATEGORY_METADATA.Combined;
  const override = ID_OVERRIDES[id] ?? {};

  return {
    ...config,
    whoShouldTake: firstNonEmptyArray(
      config.whoShouldTake,
      override.whoShouldTake,
      fallback.whoShouldTake
    ),
    possibleSymptoms: firstNonEmptyArray(
      config.possibleSymptoms,
      override.possibleSymptoms,
      fallback.possibleSymptoms
    ),
    whatThisTestChecks: firstNonEmptyArray(
      config.whatThisTestChecks,
      override.whatThisTestChecks,
      fallback.whatThisTestChecks
    ),
    beforeYouStart: firstNonEmptyArray(
      config.beforeYouStart,
      override.beforeYouStart,
      fallback.beforeYouStart
    ),
    disclaimer: firstText(
      config.disclaimer,
      override.disclaimer,
      fallback.disclaimer,
      GENERAL_DISCLAIMER
    )
  };
}
