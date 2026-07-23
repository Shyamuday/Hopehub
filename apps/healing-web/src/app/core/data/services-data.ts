import { Service, ServiceCategory } from '../models';

export const HOPE_HUB_SESSION_PRICE = 300;
export const HOPE_HUB_SESSION_CURRENCY = 'INR';
export const HOPE_HUB_SESSION_DURATION = '30 minutes';

const SERVICE_IMAGES = {
  sunrise: '/image/hopehub-healing-sunrise.png',
  meditation: '/image/hopehub-hero-meditation.png',
  nature: '/image/hopehub-calm-nature.png',
  flow: '/image/hopehub-abstract-flow.png',
} as const;

export const HOPE_HUB_SERVICES: Service[] = [
  {
    id: 'breakup-counseling',
    name: 'Breakup & Heartbreak Support',
    description:
      'Gentle support for breakup pain, attachment, closure, and rebuilding your daily rhythm.',
    detailedDescription:
      'A focused support session for people dealing with heartbreak, separation, emotional dependency, no-contact difficulty, or confusion after a relationship ends. The goal is to help you feel steadier and choose your next steps with care.',
    benefits: [
      'Process intense emotions safely',
      'Reduce overthinking and urge to reconnect',
      'Rebuild confidence and routine',
      'Create a simple healing plan',
    ],
    approach:
      'We use supportive listening, CBT-style thought work, grounding practices, and practical next-step planning.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.RELATIONSHIP,
    featured: true,
    imageUrl: SERVICE_IMAGES.sunrise,
  },
  {
    id: 'anxiety-therapy',
    name: 'Anxiety & Panic Support',
    description:
      'Support for anxious thoughts, panic feelings, fear loops, body symptoms, and daily stress.',
    detailedDescription:
      'A practical session for people experiencing worry, panic-like symptoms, racing thoughts, avoidance, or fear about everyday situations. We focus on calming tools and a plan you can actually follow.',
    benefits: [
      'Understand your anxiety pattern',
      'Learn grounding and breathing tools',
      'Reduce avoidance',
      'Build confidence for daily situations',
    ],
    approach:
      'We combine psychoeducation, grounding, breathing, CBT-informed reframing, and small exposure steps.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: true,
    imageUrl: SERVICE_IMAGES.meditation,
  },
  {
    id: 'stress-burnout-support',
    name: 'Stress & Burnout Support',
    description:
      'For work pressure, emotional exhaustion, irritability, low energy, and feeling overloaded.',
    detailedDescription:
      'A session for people feeling stretched thin by responsibilities, deadlines, caregiving, or constant mental load. We help identify pressure points and create a lighter, more realistic routine.',
    benefits: [
      'Identify stress triggers',
      'Create a realistic recovery routine',
      'Improve boundaries',
      'Reduce emotional overload',
    ],
    approach:
      'We use stress mapping, priority sorting, nervous-system regulation, and habit planning.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: true,
    imageUrl: SERVICE_IMAGES.flow,
  },
  {
    id: 'career-study-pressure',
    name: 'Career & Study Pressure',
    description:
      'Guidance for career confusion, exam pressure, workplace stress, and decision paralysis.',
    detailedDescription:
      'A focused conversation for students and professionals who feel stuck, pressured, or unsure about their next step. We help bring structure to the decision and reduce emotional noise.',
    benefits: [
      'Clarify choices and next steps',
      'Handle performance pressure',
      'Reduce decision overwhelm',
      'Build a practical action plan',
    ],
    approach:
      'We use solution-focused questions, values clarification, stress planning, and short action cycles.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.CAREER,
    featured: true,
    imageUrl: SERVICE_IMAGES.nature,
  },
  {
    id: 'relationship-guidance',
    name: 'Relationship Guidance',
    description:
      'Support for communication issues, conflict, trust concerns, boundaries, and attachment patterns.',
    detailedDescription:
      'A support session for people navigating relationship confusion, repeated conflicts, insecurity, trust concerns, or boundary issues. This can be individual guidance or partner-focused planning.',
    benefits: [
      'Understand repeated conflict patterns',
      'Improve communication',
      'Set healthier boundaries',
      'Make clearer relationship decisions',
    ],
    approach:
      'We use emotion-focused reflection, communication mapping, boundary planning, and practical scripts.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.RELATIONSHIP,
    featured: true,
    imageUrl: SERVICE_IMAGES.sunrise,
  },
  {
    id: 'self-esteem-confidence',
    name: 'Self-Esteem & Confidence',
    description:
      'Help with self-doubt, comparison, people-pleasing, guilt, and negative self-talk.',
    detailedDescription:
      'A session for people who feel not good enough, struggle with confidence, or keep putting others first. We focus on self-respect, inner language, and small confidence-building actions.',
    benefits: [
      'Challenge negative self-talk',
      'Build self-respect',
      'Reduce people-pleasing',
      'Practice small confidence steps',
    ],
    approach:
      'We use strengths-based coaching, CBT-informed reframing, self-compassion, and behavior experiments.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: false,
    imageUrl: SERVICE_IMAGES.meditation,
  },
  {
    id: 'loneliness-emotional-support',
    name: 'Loneliness & Emotional Support',
    description:
      'A safe conversation when you feel alone, unheard, disconnected, or emotionally heavy.',
    detailedDescription:
      'A supportive session for people who need a steady space to talk, organize emotions, and feel less alone. We help you name what is happening and choose one or two manageable next steps.',
    benefits: [
      'Feel heard without judgment',
      'Name difficult emotions',
      'Plan small connection steps',
      'Reduce emotional heaviness',
    ],
    approach:
      'We use supportive counseling, emotional validation, grounding, and simple connection planning.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: false,
    imageUrl: SERVICE_IMAGES.nature,
  },
  {
    id: 'sleep-overthinking-support',
    name: 'Sleep & Overthinking Support',
    description:
      'Support for racing thoughts at night, sleep routine problems, rumination, and mental restlessness.',
    detailedDescription:
      'A practical session for people who cannot switch off mentally, replay conversations, worry at night, or struggle to maintain a sleep routine.',
    benefits: [
      'Create a night routine',
      'Reduce rumination',
      'Learn calming practices',
      'Improve mental rest',
    ],
    approach: 'We use sleep hygiene planning, worry scheduling, grounding tools, and habit design.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: false,
    imageUrl: SERVICE_IMAGES.flow,
  },
  {
    id: 'family-conflict-support',
    name: 'Family Conflict Support',
    description:
      'Support for family pressure, communication gaps, expectations, boundaries, and conflict.',
    detailedDescription:
      'A session for people dealing with family tension, repeated arguments, pressure around life choices, or difficulty setting respectful boundaries.',
    benefits: [
      'Understand family patterns',
      'Prepare calmer conversations',
      'Set respectful boundaries',
      'Reduce guilt and pressure',
    ],
    approach:
      'We use family-systems thinking, communication planning, boundary scripts, and emotional regulation.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.FAMILY,
    featured: false,
    imageUrl: SERVICE_IMAGES.nature,
  },
  {
    id: 'grief-loss-support',
    name: 'Grief & Loss Support',
    description:
      'Compassionate support after loss, separation, major life change, or emotional shock.',
    detailedDescription:
      'A gentle support session for people moving through grief, sadness, numbness, or life changes that feel hard to accept. We work at your pace.',
    benefits: [
      'Process grief safely',
      'Understand your grief response',
      'Find steadier coping steps',
      'Honor the loss without rushing',
    ],
    approach:
      'We use grief-informed support, emotional pacing, grounding, and meaning-centered reflection.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: false,
    imageUrl: SERVICE_IMAGES.sunrise,
  },
  {
    id: 'depression-mood-support',
    name: 'Depression & Low Mood Support',
    description:
      'Support for sadness, low motivation, emotional heaviness, hopelessness, and daily functioning.',
    detailedDescription:
      'A gentle session for people feeling emotionally low, disconnected, tired, or unable to enjoy normal activities. We focus on understanding the pattern and taking small recovery steps.',
    benefits: [
      'Name low mood patterns',
      'Create a small activation plan',
      'Reduce isolation',
      'Build steadier daily structure',
    ],
    approach:
      'We use supportive counselling, behavioral activation, thought reframing, and routine planning.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: false,
    imageUrl: SERVICE_IMAGES.nature,
  },
  {
    id: 'anger-emotional-control',
    name: 'Anger & Emotional Control',
    description:
      'Help with anger bursts, irritation, emotional reactions, regret after conflict, and self-control.',
    detailedDescription:
      'A practical support session for people who feel their reactions become too strong too quickly. We help identify triggers and build calmer response patterns.',
    benefits: [
      'Understand anger triggers',
      'Pause before reacting',
      'Repair communication',
      'Build emotional control tools',
    ],
    approach: 'We use trigger mapping, grounding, communication scripts, and response planning.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: false,
    imageUrl: SERVICE_IMAGES.flow,
  },
  {
    id: 'social-anxiety-confidence',
    name: 'Social Anxiety & Confidence',
    description:
      'Support for fear of judgment, hesitation in groups, awkwardness, and social avoidance.',
    detailedDescription:
      'A session for people who feel anxious while speaking, meeting people, attending events, or being seen. We focus on reducing fear and building tiny confidence steps.',
    benefits: [
      'Understand social fear loops',
      'Reduce avoidance',
      'Practice confidence steps',
      'Prepare for real situations',
    ],
    approach:
      'We use CBT-informed reframing, exposure planning, grounding, and social confidence practice.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: false,
    imageUrl: SERVICE_IMAGES.meditation,
  },
  {
    id: 'exam-performance-stress',
    name: 'Exam & Performance Stress',
    description:
      'Support for exam pressure, performance anxiety, procrastination, comparison, and fear of failure.',
    detailedDescription:
      'A focused session for students and professionals facing pressure before exams, interviews, presentations, or performance moments.',
    benefits: [
      'Reduce pressure and panic',
      'Create a study or prep plan',
      'Handle fear of failure',
      'Improve focus and routine',
    ],
    approach: 'We use pressure mapping, planning, grounding, and simple performance routines.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.CAREER,
    featured: false,
    imageUrl: SERVICE_IMAGES.nature,
  },
  {
    id: 'addiction-habit-support',
    name: 'Addiction & Habit Support',
    description:
      'Support for difficult habits, urges, relapse worry, phone overuse, substances, or compulsive patterns.',
    detailedDescription:
      'A non-judgmental support session for people wanting to understand an addictive or compulsive habit and create safer next steps.',
    benefits: [
      'Understand urge cycles',
      'Identify triggers',
      'Create a safer response plan',
      'Build accountability steps',
    ],
    approach:
      'We use motivational interviewing, trigger planning, habit replacement, and relapse-prevention basics.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.ADDICTION,
    featured: false,
    imageUrl: SERVICE_IMAGES.flow,
  },
  {
    id: 'trauma-emotional-shock',
    name: 'Trauma & Emotional Shock Support',
    description:
      'Gentle support after emotionally shocking events, betrayal, fear, or experiences that still feel stuck.',
    detailedDescription:
      'A careful first support session for people feeling shaken, unsafe, numb, or repeatedly triggered after a difficult experience. We keep the pace gentle and grounding-focused.',
    benefits: [
      'Stabilize immediate distress',
      'Learn grounding tools',
      'Understand trigger responses',
      'Plan next support steps',
    ],
    approach: 'We use trauma-informed listening, grounding, emotional pacing, and safety planning.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.MENTAL_HEALTH,
    featured: false,
    imageUrl: SERVICE_IMAGES.sunrise,
  },
  {
    id: 'parenting-child-behavior',
    name: 'Parenting & Child Behavior Support',
    description:
      'Guidance for parent stress, child behavior concerns, communication, routines, and emotional regulation.',
    detailedDescription:
      'A support session for parents who feel overwhelmed or unsure how to respond to behavior, study stress, screen time, anger, or emotional needs at home.',
    benefits: [
      'Understand behavior patterns',
      'Create calmer routines',
      'Improve parent-child communication',
      'Reduce parent burnout',
    ],
    approach:
      'We use parent coaching, routine planning, communication tools, and emotional regulation strategies.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.FAMILY,
    featured: false,
    imageUrl: SERVICE_IMAGES.nature,
  },
  {
    id: 'couples-pre-marriage-guidance',
    name: 'Couples & Pre-Marriage Guidance',
    description:
      'Support for couples dealing with expectations, communication, trust, family pressure, or marriage decisions.',
    detailedDescription:
      'A guided conversation for couples or individuals preparing for important relationship decisions, marriage expectations, or recurring communication gaps.',
    benefits: [
      'Clarify expectations',
      'Improve communication',
      'Discuss family pressure',
      'Plan healthier decisions',
    ],
    approach:
      'We use structured conversation, expectation mapping, conflict prevention, and boundary planning.',
    pricing: { individual: HOPE_HUB_SESSION_PRICE, currency: HOPE_HUB_SESSION_CURRENCY },
    category: ServiceCategory.RELATIONSHIP,
    featured: false,
    imageUrl: SERVICE_IMAGES.sunrise,
  },
];

export type FeaturedService = {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  discount?: number;
  consultantName: string;
  consultantPhone: string;
  duration: string;
  image: string;
  featured: boolean;
  bookingUrl?: string;
  badge?: string;
};

const featuredBadges: Record<string, string> = {
  'breakup-counseling': 'Popular',
  'anxiety-therapy': 'Anxiety care',
  'stress-burnout-support': 'Stress support',
  'career-study-pressure': 'Career support',
  'relationship-guidance': 'Relationships',
};

export const FEATURED_SERVICES: FeaturedService[] = HOPE_HUB_SERVICES.filter(
  (service) => service.featured,
).map((service) => ({
  id: service.id,
  name: service.name,
  description: service.description,
  price: HOPE_HUB_SESSION_PRICE,
  currency: HOPE_HUB_SESSION_CURRENCY,
  consultantName: 'Hope Hub Care Team',
  consultantPhone: '',
  duration: HOPE_HUB_SESSION_DURATION,
  image: service.imageUrl ?? '',
  featured: service.featured,
  badge: featuredBadges[service.id],
}));

export const SERVICE_PRICING = Object.fromEntries(
  HOPE_HUB_SERVICES.map((service) => [
    service.id,
    {
      individual: HOPE_HUB_SESSION_PRICE,
      currency: HOPE_HUB_SESSION_CURRENCY,
    },
  ]),
);

export function getAllServices(): Service[] {
  return HOPE_HUB_SERVICES;
}

export function getFeaturedServices(): FeaturedService[] {
  return FEATURED_SERVICES;
}

export function getServiceById(serviceId: string): Service | undefined {
  return HOPE_HUB_SERVICES.find((service) => service.id === serviceId);
}

export function getServiceIds(): string[] {
  return HOPE_HUB_SERVICES.map((service) => service.id);
}

export function getServicePricing(serviceId: string) {
  return SERVICE_PRICING[serviceId as keyof typeof SERVICE_PRICING];
}
