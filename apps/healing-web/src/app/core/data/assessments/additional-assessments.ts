import {
  AssessmentConfig,
  AssessmentType,
  AssessmentCategory,
} from '../../models/assessment.model';

const STANDARD_FREQUENCY_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
  { value: 4, label: 'Almost always' },
];

const STANDARD_HELP_LINES = [
  { name: 'AASRA', number: '91-9820466726' },
  { name: 'Sneha', number: '044-24640050' },
  { name: 'Emergency', number: '112' },
];

const STANDARD_DISCLAIMER =
  'This self-check is for education and self-reflection only. It is not a diagnosis. If symptoms feel intense, persistent, unsafe, or disruptive, please speak with a qualified mental health professional.';

const fourBandScoring = (
  labels: [string, string, string, string],
  descriptions: [string, string, string, string],
): AssessmentConfig['scoring'] => [
  {
    min: 0,
    max: 8,
    level: labels[0],
    color: 'green',
    description: descriptions[0],
    suggestions: [
      'Continue current healthy coping habits',
      'Notice early warning signs before they grow',
      'Keep a steady sleep, movement, and connection routine',
    ],
  },
  {
    min: 9,
    max: 16,
    level: labels[1],
    color: 'yellow',
    description: descriptions[1],
    suggestions: [
      'Track when these feelings show up and what helps',
      'Practice grounding, breathing, or journaling regularly',
      'Consider talking with a trusted person or counsellor',
    ],
  },
  {
    min: 17,
    max: 26,
    level: labels[2],
    color: 'orange',
    description: descriptions[2],
    suggestions: [
      'Consider booking professional support',
      'Create a simple coping plan for difficult moments',
      'Reduce avoidable triggers while building healthier responses',
    ],
  },
  {
    min: 27,
    max: 40,
    level: labels[3],
    color: 'red',
    description: descriptions[3],
    suggestions: [
      'Seek professional mental health support soon',
      'Tell a trusted person what you are experiencing',
      'Use crisis or emergency support immediately if you feel unsafe',
    ],
  },
];

export const ADDITIONAL_ASSESSMENTS: AssessmentConfig[] = [
  {
    id: 'panic-symptoms',
    type: AssessmentType.PANIC,
    category: AssessmentCategory.PANIC,
    title: 'Panic Symptoms Self-Check',
    description: 'A quick self-check for panic-like body sensations, fear surges, and avoidance.',
    instructions: 'Over the last 2 weeks, how often have you experienced the following?',
    timeframe: 'Past 2 weeks',
    duration: '3-4 minutes',
    questions: [
      { id: 1, text: 'Sudden waves of intense fear or discomfort', category: 'panic' },
      {
        id: 2,
        text: 'Racing heart, chest tightness, or shortness of breath during fear',
        category: 'body',
      },
      {
        id: 3,
        text: 'Feeling dizzy, shaky, sweaty, or unreal during anxious moments',
        category: 'body',
      },
      {
        id: 4,
        text: 'Fear that you might lose control, faint, or something bad will happen',
        category: 'fear',
      },
      {
        id: 5,
        text: 'Avoiding places or situations because a panic episode may happen',
        category: 'avoidance',
      },
      { id: 6, text: 'Checking your body repeatedly for signs of danger', category: 'checking' },
      { id: 7, text: 'Needing someone nearby to feel safe in certain places', category: 'safety' },
      {
        id: 8,
        text: 'Worrying about when the next panic episode may happen',
        category: 'anticipation',
      },
      {
        id: 9,
        text: 'Leaving situations early because anxiety feels too intense',
        category: 'avoidance',
      },
      {
        id: 10,
        text: 'Panic symptoms disrupting work, study, travel, or social plans',
        category: 'impact',
      },
    ],
    responseOptions: STANDARD_FREQUENCY_OPTIONS,
    scoring: fourBandScoring(
      [
        'Low Panic Symptoms',
        'Mild Panic Symptoms',
        'Moderate Panic Symptoms',
        'High Panic Symptoms',
      ],
      [
        'Your responses suggest low panic-like symptoms.',
        'Your responses suggest mild panic-like symptoms that may benefit from coping practice.',
        'Your responses suggest panic symptoms are starting to affect daily life.',
        'Your responses suggest panic symptoms may be significantly disruptive.',
      ],
    ),
    disclaimer: STANDARD_DISCLAIMER,
    emergencyHelplines: STANDARD_HELP_LINES,
  },
  {
    id: 'social-anxiety',
    type: AssessmentType.SOCIAL_ANXIETY,
    category: AssessmentCategory.SOCIAL_ANXIETY,
    title: 'Social Anxiety Self-Check',
    description: 'A self-check for fear of judgment, social avoidance, and performance anxiety.',
    instructions: 'Over the last month, how often have these social concerns affected you?',
    timeframe: 'Past month',
    duration: '3-5 minutes',
    questions: [
      {
        id: 1,
        text: 'Feeling very anxious before meeting people or speaking in a group',
        category: 'anticipation',
      },
      {
        id: 2,
        text: 'Worrying that others will judge, reject, or criticize you',
        category: 'fear',
      },
      {
        id: 3,
        text: 'Avoiding calls, meetings, classes, or events because of social fear',
        category: 'avoidance',
      },
      {
        id: 4,
        text: 'Overthinking what you said after social interactions',
        category: 'rumination',
      },
      {
        id: 5,
        text: 'Finding it hard to make eye contact or start conversations',
        category: 'interaction',
      },
      {
        id: 6,
        text: 'Fear of eating, writing, presenting, or performing while others watch',
        category: 'performance',
      },
      {
        id: 7,
        text: 'Using silence, hiding, or leaving early to reduce social anxiety',
        category: 'safety',
      },
      {
        id: 8,
        text: 'Feeling embarrassed by physical anxiety signs like blushing or shaking',
        category: 'body',
      },
      {
        id: 9,
        text: 'Missing opportunities because social situations feel too hard',
        category: 'impact',
      },
      { id: 10, text: 'Feeling lonely even when you want more connection', category: 'connection' },
    ],
    responseOptions: STANDARD_FREQUENCY_OPTIONS,
    scoring: fourBandScoring(
      [
        'Low Social Anxiety',
        'Mild Social Anxiety',
        'Moderate Social Anxiety',
        'High Social Anxiety',
      ],
      [
        'Your responses suggest social anxiety is low right now.',
        'Your responses suggest mild social anxiety in some situations.',
        'Your responses suggest social anxiety may be limiting your choices.',
        'Your responses suggest social anxiety may be strongly affecting your life.',
      ],
    ),
    disclaimer: STANDARD_DISCLAIMER,
    emergencyHelplines: STANDARD_HELP_LINES,
  },
  {
    id: 'loneliness',
    type: AssessmentType.LONELINESS,
    category: AssessmentCategory.LONELINESS,
    title: 'Loneliness & Connection Self-Check',
    description: 'A short self-check for emotional loneliness, isolation, and connection needs.',
    instructions: 'Over the last month, how often have you felt the following?',
    timeframe: 'Past month',
    duration: '3 minutes',
    questions: [
      { id: 1, text: 'Feeling left out or disconnected from others', category: 'disconnection' },
      { id: 2, text: 'Wanting support but not knowing who to reach out to', category: 'support' },
      {
        id: 3,
        text: 'Feeling alone even when people are around',
        category: 'emotional-loneliness',
      },
      {
        id: 4,
        text: 'Avoiding people because connection feels tiring or risky',
        category: 'avoidance',
      },
      {
        id: 5,
        text: 'Missing having someone who really understands you',
        category: 'understanding',
      },
      {
        id: 6,
        text: 'Spending long periods isolated from friends, family, or community',
        category: 'isolation',
      },
      { id: 7, text: 'Feeling unsure how to rebuild social connection', category: 'skills' },
      { id: 8, text: 'Using scrolling or distractions to numb loneliness', category: 'coping' },
      {
        id: 9,
        text: 'Feeling your relationships lack depth or emotional safety',
        category: 'quality',
      },
      { id: 10, text: 'Loneliness affecting your mood, sleep, or motivation', category: 'impact' },
    ],
    responseOptions: STANDARD_FREQUENCY_OPTIONS,
    scoring: fourBandScoring(
      ['Low Loneliness', 'Mild Loneliness', 'Moderate Loneliness', 'High Loneliness'],
      [
        'Your responses suggest your connection needs are mostly being met.',
        'Your responses suggest some loneliness or disconnection.',
        'Your responses suggest loneliness may be affecting your well-being.',
        'Your responses suggest loneliness may be significantly painful or disruptive.',
      ],
    ),
    disclaimer: STANDARD_DISCLAIMER,
    emergencyHelplines: STANDARD_HELP_LINES,
  },
  {
    id: 'self-esteem',
    type: AssessmentType.SELF_ESTEEM,
    category: AssessmentCategory.SELF_ESTEEM,
    title: 'Self-Esteem Self-Check',
    description: 'A self-reflection tool for self-worth, confidence, and inner criticism.',
    instructions: 'Over the last 2 weeks, how often have these thoughts or feelings shown up?',
    timeframe: 'Past 2 weeks',
    duration: '3 minutes',
    questions: [
      { id: 1, text: 'Being harsh or critical toward yourself', category: 'self-criticism' },
      { id: 2, text: 'Feeling not good enough even after trying hard', category: 'worth' },
      { id: 3, text: 'Comparing yourself negatively with others', category: 'comparison' },
      { id: 4, text: 'Dismissing compliments or positive feedback', category: 'acceptance' },
      {
        id: 5,
        text: 'Avoiding goals because you fear failing or being judged',
        category: 'avoidance',
      },
      { id: 6, text: 'Feeling undeserving of care, respect, or good things', category: 'worth' },
      {
        id: 7,
        text: 'Letting others cross boundaries because saying no feels hard',
        category: 'boundaries',
      },
      { id: 8, text: 'Needing approval to feel okay about yourself', category: 'approval' },
      {
        id: 9,
        text: 'Feeling shame about your needs, emotions, or past choices',
        category: 'shame',
      },
      { id: 10, text: 'Self-doubt stopping you from expressing yourself', category: 'confidence' },
    ],
    responseOptions: STANDARD_FREQUENCY_OPTIONS,
    scoring: fourBandScoring(
      [
        'Healthy Self-Esteem Range',
        'Mild Self-Esteem Strain',
        'Moderate Self-Esteem Strain',
        'High Self-Esteem Strain',
      ],
      [
        'Your responses suggest self-esteem concerns are low right now.',
        'Your responses suggest some self-doubt or inner criticism.',
        'Your responses suggest self-esteem struggles may be affecting choices and relationships.',
        'Your responses suggest self-esteem pain may be deeply affecting daily life.',
      ],
    ),
    disclaimer: STANDARD_DISCLAIMER,
    emergencyHelplines: STANDARD_HELP_LINES,
  },
  {
    id: 'anger-regulation',
    type: AssessmentType.ANGER,
    category: AssessmentCategory.ANGER,
    title: 'Anger Regulation Self-Check',
    description:
      'A practical self-check for irritability, anger intensity, and repair after conflict.',
    instructions: 'Over the last month, how often have these anger patterns happened?',
    timeframe: 'Past month',
    duration: '3-4 minutes',
    questions: [
      {
        id: 1,
        text: 'Feeling irritated or angry more quickly than usual',
        category: 'irritability',
      },
      { id: 2, text: 'Saying things in anger that you later regret', category: 'expression' },
      { id: 3, text: 'Finding it hard to calm down once anger starts', category: 'regulation' },
      {
        id: 4,
        text: 'Using silence, withdrawal, or coldness to punish others',
        category: 'withdrawal',
      },
      {
        id: 5,
        text: 'Raising your voice, arguing intensely, or losing control',
        category: 'conflict',
      },
      {
        id: 6,
        text: 'Feeling anger in your body as tension, heat, or restlessness',
        category: 'body',
      },
      { id: 7, text: 'Holding resentment after conflicts are over', category: 'resentment' },
      { id: 8, text: 'Struggling to explain your needs without blame', category: 'communication' },
      {
        id: 9,
        text: 'Anger affecting relationships, work, study, or home life',
        category: 'impact',
      },
      { id: 10, text: 'Feeling guilty or ashamed after angry reactions', category: 'repair' },
    ],
    responseOptions: STANDARD_FREQUENCY_OPTIONS,
    scoring: fourBandScoring(
      ['Low Anger Strain', 'Mild Anger Strain', 'Moderate Anger Strain', 'High Anger Strain'],
      [
        'Your responses suggest anger is mostly manageable.',
        'Your responses suggest some anger patterns may need attention.',
        'Your responses suggest anger may be affecting communication or relationships.',
        'Your responses suggest anger regulation may need active professional support.',
      ],
    ),
    disclaimer: STANDARD_DISCLAIMER,
    emergencyHelplines: STANDARD_HELP_LINES,
  },
  {
    id: 'grief-support',
    type: AssessmentType.GRIEF,
    category: AssessmentCategory.GRIEF,
    title: 'Grief Support Self-Check',
    description:
      'A gentle self-check for grief intensity, functioning, and support needs after loss.',
    instructions:
      'Thinking about your loss, how often have you experienced the following recently?',
    timeframe: 'Recent weeks',
    duration: '4 minutes',
    questions: [
      { id: 1, text: 'Waves of sadness, yearning, or emotional pain', category: 'sadness' },
      {
        id: 2,
        text: 'Feeling numb, unreal, or disconnected from daily life',
        category: 'numbness',
      },
      { id: 3, text: 'Difficulty accepting or making sense of the loss', category: 'acceptance' },
      {
        id: 4,
        text: 'Avoiding reminders, places, people, or conversations connected to the loss',
        category: 'avoidance',
      },
      {
        id: 5,
        text: 'Feeling guilt, regret, anger, or unfinished business',
        category: 'complex-emotions',
      },
      { id: 6, text: 'Sleep, appetite, concentration, or energy being affected', category: 'body' },
      { id: 7, text: 'Feeling alone in your grief or unsupported by others', category: 'support' },
      {
        id: 8,
        text: 'Struggling to manage responsibilities because of grief',
        category: 'functioning',
      },
      {
        id: 9,
        text: 'Feeling afraid that life will not feel meaningful again',
        category: 'meaning',
      },
      {
        id: 10,
        text: 'Thoughts that you do not want to continue or cannot stay safe',
        category: 'safety',
      },
    ],
    responseOptions: STANDARD_FREQUENCY_OPTIONS,
    scoring: fourBandScoring(
      [
        'Gentle Grief Response',
        'Active Grief Support Needed',
        'High Grief Distress',
        'Urgent Grief Support Needed',
      ],
      [
        'Your responses suggest grief is present but currently manageable.',
        'Your responses suggest grief may need more care and support.',
        'Your responses suggest grief is significantly affecting your well-being.',
        'Your responses suggest grief distress may be intense and safety support may be important.',
      ],
    ),
    safetyQuestionIndex: 9,
    disclaimer:
      'This grief self-check is for support and reflection only. Grief is not an illness, but intense or unsafe distress deserves immediate care.',
    emergencyHelplines: STANDARD_HELP_LINES,
  },
];
