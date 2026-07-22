import 'dotenv/config';
import { ProviderType } from '@prisma/client';
import { prisma } from '../src/db.js';

type SeedService = {
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  expertTypes: ProviderType[];
  summary: string;
  description: string;
  priceInPaise: number;
  compareAtPriceInPaise?: number;
  durationMinutes: number;
  tags: string[];
  relatedDiseaseSlugs?: string[];
  sortOrder: number;
  isFeatured?: boolean;
};

const commonIncludes = [
  'Online expert consultation',
  'Short intake review',
  'Personalised next steps',
  'Follow-up recommendation'
];

const commonOutcomes = [
  'Clearer understanding of your concern',
  'Practical care plan',
  'Escalation guidance when needed'
];

const services: SeedService[] = [
  {
    slug: 'general-health-consultation',
    title: 'General Health Consultation',
    shortTitle: 'General consultation',
    category: 'Medical Care',
    expertTypes: [ProviderType.DOCTOR, ProviderType.SPECIALIST],
    summary:
      'Online care for fever, cough, pain, infections, digestion issues, allergies, and everyday health concerns.',
    description:
      'Share symptoms, history, photos or reports, then get expert guidance with prescriptions where appropriate and follow-up support.',
    priceInPaise: 49900,
    compareAtPriceInPaise: 79900,
    durationMinutes: 20,
    tags: ['acute care', 'prescription', 'online'],
    relatedDiseaseSlugs: ['fever', 'cough', 'digestive-problems', 'allergy'],
    sortOrder: 10,
    isFeatured: true
  },
  {
    slug: 'chronic-care-consultation',
    title: 'Chronic Care Consultation',
    shortTitle: 'Chronic care',
    category: 'Chronic Care',
    expertTypes: [ProviderType.DOCTOR, ProviderType.SPECIALIST, ProviderType.HEALTH_COACH],
    summary:
      'Ongoing online guidance for diabetes, hypertension, thyroid, kidney, liver, respiratory, and long-term health conditions.',
    description:
      'Review your condition history, medicines, reports, lifestyle and follow-up needs to build a safer continuity plan.',
    priceInPaise: 79900,
    compareAtPriceInPaise: 119900,
    durationMinutes: 35,
    tags: ['chronic', 'follow-up', 'reports'],
    relatedDiseaseSlugs: ['diabetes', 'hypertension', 'thyroid', 'kidney-disease'],
    sortOrder: 20,
    isFeatured: true
  },
  {
    slug: 'skin-hair-consultation',
    title: 'Skin and Hair Consultation',
    shortTitle: 'Skin and hair',
    category: 'Skin and Hair',
    expertTypes: [ProviderType.DOCTOR, ProviderType.SPECIALIST],
    summary:
      'Online consultation for acne, rashes, pigmentation, itching, hair fall, dandruff, and scalp concerns.',
    description:
      'Upload photos and describe symptoms so an expert can review patterns and guide treatment or escalation.',
    priceInPaise: 69900,
    compareAtPriceInPaise: 99900,
    durationMinutes: 25,
    tags: ['skin', 'hair', 'photos'],
    relatedDiseaseSlugs: ['skin-care', 'hair-fall'],
    sortOrder: 30,
    isFeatured: true
  },
  {
    slug: 'women-health-consultation',
    title: "Women's Health Consultation",
    shortTitle: "Women's health",
    category: "Women's Health",
    expertTypes: [ProviderType.DOCTOR, ProviderType.SPECIALIST],
    summary:
      'Online support for period concerns, PCOS, fertility questions, pregnancy guidance, menopause, and intimate health.',
    description:
      'Discuss symptoms privately and receive guidance on next steps, tests, lifestyle, prescriptions, or specialist referral.',
    priceInPaise: 89900,
    compareAtPriceInPaise: 129900,
    durationMinutes: 35,
    tags: ['women', 'pcos', 'fertility', 'pregnancy'],
    relatedDiseaseSlugs: ['pcos', 'womens-health'],
    sortOrder: 40,
    isFeatured: true
  },
  {
    slug: 'child-health-consultation',
    title: 'Child Health Consultation',
    shortTitle: 'Child health',
    category: 'Child Care',
    expertTypes: [ProviderType.DOCTOR, ProviderType.SPECIALIST],
    summary:
      'Online care guidance for common child health concerns, growth questions, nutrition, fever, cough, allergies, and follow-up.',
    description:
      'Parents can share symptoms, age, weight, history, and reports for safer online guidance and escalation advice.',
    priceInPaise: 69900,
    compareAtPriceInPaise: 99900,
    durationMinutes: 25,
    tags: ['child', 'pediatric', 'parent support'],
    relatedDiseaseSlugs: ['child-health', 'fever', 'allergy'],
    sortOrder: 50
  },
  {
    slug: 'psychologist-consultation',
    title: 'Psychologist Consultation',
    shortTitle: 'Psychologist',
    category: 'Mental Wellness',
    expertTypes: [ProviderType.PSYCHOLOGIST],
    summary:
      'Structured online support for stress, anxiety, mood, relationship concerns, behaviour patterns, and emotional wellbeing.',
    description:
      'A private online consultation focused on understanding your concern, current stressors, patterns, goals, and next-step care plan.',
    priceInPaise: 89900,
    compareAtPriceInPaise: 129900,
    durationMinutes: 45,
    tags: ['mental wellness', 'stress', 'anxiety', 'therapy'],
    relatedDiseaseSlugs: ['anxiety', 'stress', 'sleep-problems'],
    sortOrder: 100,
    isFeatured: true
  },
  {
    slug: 'clinical-psychologist-consultation',
    title: 'Clinical Psychologist Consultation',
    shortTitle: 'Clinical psychologist',
    category: 'Mental Wellness',
    expertTypes: [ProviderType.PSYCHOLOGIST],
    summary:
      'Clinical psychology support for anxiety, depression, trauma, emotional regulation, and deeper mental health assessment needs.',
    description:
      'Get structured assessment and care planning from a clinical psychology expert, with referral guidance when psychiatric care is needed.',
    priceInPaise: 119900,
    compareAtPriceInPaise: 159900,
    durationMinutes: 50,
    tags: ['clinical psychology', 'anxiety', 'depression', 'trauma'],
    relatedDiseaseSlugs: ['anxiety', 'depression', 'mental-health'],
    sortOrder: 110,
    isFeatured: true
  },
  {
    slug: 'child-psychologist-consultation',
    title: 'Child Psychologist Consultation',
    shortTitle: 'Child psychologist',
    category: 'Mental Wellness',
    expertTypes: [ProviderType.PSYCHOLOGIST],
    summary:
      'Support for child behaviour, emotional concerns, school stress, confidence, attention, routines, and parent guidance.',
    description:
      'Parents can discuss behaviour patterns, school context, development concerns, and practical home support strategies.',
    priceInPaise: 119900,
    compareAtPriceInPaise: 159900,
    durationMinutes: 50,
    tags: ['child psychologist', 'behaviour', 'school stress', 'parent guidance'],
    relatedDiseaseSlugs: ['child-mental-health', 'stress'],
    sortOrder: 120
  },
  {
    slug: 'counselling-session',
    title: 'Counselling Session',
    shortTitle: 'Counselling',
    category: 'Mental Wellness',
    expertTypes: [ProviderType.COUNSELLOR, ProviderType.PSYCHOTHERAPIST, ProviderType.LIFE_COACH],
    summary:
      'Online counselling for life stress, family and relationship concerns, career stress, habit change, and emotional support.',
    description:
      'Get a focused counselling session that helps you express the concern, identify patterns, and leave with practical next steps.',
    priceInPaise: 69900,
    compareAtPriceInPaise: 99900,
    durationMinutes: 40,
    tags: ['counselling', 'relationships', 'career', 'stress'],
    relatedDiseaseSlugs: ['stress', 'relationship-stress'],
    sortOrder: 130,
    isFeatured: true
  },
  {
    slug: 'relationship-family-counselling',
    title: 'Relationship and Family Counselling',
    shortTitle: 'Relationship counselling',
    category: 'Mental Wellness',
    expertTypes: [ProviderType.COUNSELLOR, ProviderType.THERAPIST, ProviderType.PSYCHOTHERAPIST],
    summary:
      'Guidance for relationship stress, family conflict, marriage concerns, communication issues, and emotional boundaries.',
    description:
      'Discuss relationship context privately and receive structured guidance for communication, boundaries, and next steps.',
    priceInPaise: 89900,
    compareAtPriceInPaise: 129900,
    durationMinutes: 45,
    tags: ['relationship', 'family', 'marriage', 'communication'],
    relatedDiseaseSlugs: ['relationship-stress', 'stress'],
    sortOrder: 140
  },
  {
    slug: 'career-counselling',
    title: 'Career Counselling',
    shortTitle: 'Career counselling',
    category: 'Mental Wellness',
    expertTypes: [ProviderType.COUNSELLOR, ProviderType.LIFE_COACH],
    summary:
      'Online support for career confusion, work stress, study decisions, confidence, burnout, and professional transitions.',
    description:
      'Clarify goals, constraints, strengths, stressors, and next steps with a focused career counselling session.',
    priceInPaise: 69900,
    compareAtPriceInPaise: 99900,
    durationMinutes: 40,
    tags: ['career', 'work stress', 'students', 'burnout'],
    relatedDiseaseSlugs: ['stress'],
    sortOrder: 150
  },
  {
    slug: 'addiction-counselling',
    title: 'Addiction Counselling',
    shortTitle: 'Addiction counselling',
    category: 'Mental Wellness',
    expertTypes: [ProviderType.COUNSELLOR, ProviderType.PSYCHOLOGIST],
    summary:
      'Support for tobacco, alcohol, screen, gaming, habit loops, cravings, relapse prevention, and family guidance.',
    description:
      'Build a safer change plan with counselling support and referral guidance when medical or psychiatric care is needed.',
    priceInPaise: 89900,
    compareAtPriceInPaise: 129900,
    durationMinutes: 45,
    tags: ['addiction', 'habit change', 'cravings', 'relapse'],
    relatedDiseaseSlugs: ['addiction', 'stress'],
    sortOrder: 160
  },
  {
    slug: 'psychiatrist-consultation',
    title: 'Psychiatrist Consultation',
    shortTitle: 'Psychiatrist',
    category: 'Mental Wellness',
    expertTypes: [ProviderType.PSYCHIATRIST],
    summary:
      'Medical mental health consultation for symptoms that may need diagnosis, medicines, risk review, or psychiatric follow-up.',
    description:
      'Consult a psychiatrist for structured medical assessment and guidance. Emergency or self-harm risk needs immediate local emergency care.',
    priceInPaise: 129900,
    compareAtPriceInPaise: 179900,
    durationMinutes: 35,
    tags: ['psychiatry', 'medicine', 'depression', 'anxiety'],
    relatedDiseaseSlugs: ['depression', 'anxiety', 'mental-health'],
    sortOrder: 170
  },
  {
    slug: 'ayurveda-consultation',
    title: 'Ayurveda Consultation',
    shortTitle: 'Ayurveda',
    category: 'AYUSH',
    expertTypes: [ProviderType.AYURVEDA_DOCTOR],
    summary:
      'Online Ayurveda consultation for lifestyle, digestion, sleep, stress, chronic wellbeing, and preventive care.',
    description:
      'Discuss your concern and routine with an Ayurveda doctor for personalised diet, lifestyle, and treatment guidance.',
    priceInPaise: 69900,
    compareAtPriceInPaise: 99900,
    durationMinutes: 30,
    tags: ['ayurveda', 'lifestyle', 'digestion', 'preventive'],
    relatedDiseaseSlugs: ['digestive-problems', 'stress'],
    sortOrder: 200
  },
  {
    slug: 'homeopathy-consultation',
    title: 'Homeopathy Consultation',
    shortTitle: 'Homeopathy',
    category: 'AYUSH',
    expertTypes: [ProviderType.HOMEOPATH],
    summary:
      'Online homeopathy consultation for acute and chronic concerns with detailed case review and follow-up guidance.',
    description:
      'Share symptoms, triggers, history, and patterns for a detailed homeopathy case consultation.',
    priceInPaise: 69900,
    compareAtPriceInPaise: 99900,
    durationMinutes: 35,
    tags: ['homeopathy', 'chronic', 'case review'],
    relatedDiseaseSlugs: ['skin-care', 'hair-fall', 'chronic-care'],
    sortOrder: 210
  },
  {
    slug: 'dietitian-nutrition-consult',
    title: 'Dietitian and Nutrition Consultation',
    shortTitle: 'Nutrition consult',
    category: 'Nutrition',
    expertTypes: [
      ProviderType.DIETITIAN,
      ProviderType.NUTRITIONIST,
      ProviderType.DIABETES_EDUCATOR
    ],
    summary:
      'Online nutrition guidance for weight, diabetes, digestion, lifestyle, sports nutrition, and long-term food planning.',
    description:
      'Review your routine, food pattern, goals, medical needs, and preferences to get a practical nutrition plan.',
    priceInPaise: 79900,
    compareAtPriceInPaise: 119900,
    durationMinutes: 35,
    tags: ['nutrition', 'diet', 'diabetes', 'weight'],
    relatedDiseaseSlugs: ['diabetes', 'obesity', 'digestive-problems'],
    sortOrder: 300,
    isFeatured: true
  },
  {
    slug: 'weight-management-consultation',
    title: 'Weight Management Consultation',
    shortTitle: 'Weight management',
    category: 'Nutrition',
    expertTypes: [ProviderType.DIETITIAN, ProviderType.NUTRITIONIST, ProviderType.HEALTH_COACH],
    summary:
      'Structured guidance for weight loss, weight gain, metabolic health, food habits, cravings, and sustainable routines.',
    description:
      'Map your routine, sleep, activity, food pattern, and health goals into a practical plan.',
    priceInPaise: 89900,
    compareAtPriceInPaise: 129900,
    durationMinutes: 40,
    tags: ['weight loss', 'weight gain', 'metabolic health', 'habits'],
    relatedDiseaseSlugs: ['obesity', 'diabetes'],
    sortOrder: 310
  },
  {
    slug: 'diabetes-education-consultation',
    title: 'Diabetes Education Consultation',
    shortTitle: 'Diabetes education',
    category: 'Nutrition',
    expertTypes: [
      ProviderType.DIABETES_EDUCATOR,
      ProviderType.DIETITIAN,
      ProviderType.HEALTH_COACH
    ],
    summary:
      'Education and coaching for sugar monitoring, food planning, lifestyle, reports, and safer diabetes follow-up.',
    description:
      'Understand glucose patterns, diet, activity, warning signs, and follow-up tracking with a diabetes educator.',
    priceInPaise: 79900,
    compareAtPriceInPaise: 119900,
    durationMinutes: 35,
    tags: ['diabetes', 'education', 'lifestyle', 'reports'],
    relatedDiseaseSlugs: ['diabetes'],
    sortOrder: 320
  },
  {
    slug: 'physiotherapy-consultation',
    title: 'Physiotherapy Consultation',
    shortTitle: 'Physiotherapy',
    category: 'Rehabilitation',
    expertTypes: [ProviderType.PHYSIOTHERAPIST, ProviderType.REHABILITATION_SPECIALIST],
    summary:
      'Online physiotherapy guidance for pain, stiffness, posture, injury recovery, mobility, and rehab planning.',
    description:
      'Discuss pain pattern, mobility limits, history, and goals so an expert can guide safe exercises and next steps.',
    priceInPaise: 79900,
    compareAtPriceInPaise: 119900,
    durationMinutes: 30,
    tags: ['physiotherapy', 'pain', 'rehab', 'mobility'],
    relatedDiseaseSlugs: ['back-pain', 'joint-pain'],
    sortOrder: 400,
    isFeatured: true
  },
  {
    slug: 'occupational-therapy-consultation',
    title: 'Occupational Therapy Consultation',
    shortTitle: 'Occupational therapy',
    category: 'Rehabilitation',
    expertTypes: [ProviderType.OCCUPATIONAL_THERAPIST],
    summary:
      'Support for daily activity limitations, hand function, sensory needs, workplace ergonomics, and rehabilitation planning.',
    description:
      'Review functional challenges and receive practical adaptation, exercise, and referral guidance.',
    priceInPaise: 89900,
    compareAtPriceInPaise: 129900,
    durationMinutes: 40,
    tags: ['occupational therapy', 'daily living', 'ergonomics', 'rehab'],
    relatedDiseaseSlugs: ['rehabilitation', 'joint-pain'],
    sortOrder: 410
  },
  {
    slug: 'speech-therapy-consultation',
    title: 'Speech Therapy Consultation',
    shortTitle: 'Speech therapy',
    category: 'Rehabilitation',
    expertTypes: [ProviderType.SPEECH_THERAPIST],
    summary:
      'Online guidance for speech delay, fluency, voice concerns, swallowing support, and communication planning.',
    description:
      'Discuss communication concerns and receive initial guidance, home activities, and referral recommendations.',
    priceInPaise: 89900,
    compareAtPriceInPaise: 129900,
    durationMinutes: 40,
    tags: ['speech therapy', 'communication', 'voice', 'child development'],
    relatedDiseaseSlugs: ['speech-delay'],
    sortOrder: 420
  },
  {
    slug: 'dental-consultation',
    title: 'Dental Consultation',
    shortTitle: 'Dental',
    category: 'Dental',
    expertTypes: [ProviderType.DENTIST],
    summary:
      'Online dental guidance for tooth pain, sensitivity, gum concerns, oral hygiene, braces questions, and procedure advice.',
    description:
      'Share symptoms and photos where helpful for dental triage, self-care boundaries, and next-step planning.',
    priceInPaise: 59900,
    compareAtPriceInPaise: 89900,
    durationMinutes: 20,
    tags: ['dental', 'tooth pain', 'gum', 'oral care'],
    relatedDiseaseSlugs: ['dental-pain'],
    sortOrder: 500
  },
  {
    slug: 'lab-report-review',
    title: 'Lab Report Review',
    shortTitle: 'Report review',
    category: 'Diagnostics',
    expertTypes: [ProviderType.DOCTOR, ProviderType.PATHOLOGIST, ProviderType.LAB_TECHNICIAN],
    summary:
      'Online review of blood tests, urine tests, imaging reports, and health checkup results with next-step guidance.',
    description:
      'Upload reports and discuss what they may mean, what to track, and when specialist follow-up is needed.',
    priceInPaise: 49900,
    compareAtPriceInPaise: 79900,
    durationMinutes: 20,
    tags: ['lab reports', 'diagnostics', 'health checkup', 'review'],
    relatedDiseaseSlugs: ['lab-report-review'],
    sortOrder: 600
  },
  {
    slug: 'imaging-report-review',
    title: 'Imaging Report Review',
    shortTitle: 'Imaging review',
    category: 'Diagnostics',
    expertTypes: [ProviderType.RADIOLOGIST, ProviderType.DOCTOR, ProviderType.SPECIALIST],
    summary:
      'Review guidance for X-ray, ultrasound, CT, MRI, and scan reports with clinical next-step advice.',
    description:
      'Share report text and relevant history to understand findings and decide the next care step.',
    priceInPaise: 79900,
    compareAtPriceInPaise: 119900,
    durationMinutes: 25,
    tags: ['imaging', 'x-ray', 'mri', 'ct scan', 'ultrasound'],
    relatedDiseaseSlugs: ['imaging-report-review'],
    sortOrder: 610
  },
  {
    slug: 'pharmacist-medicine-review',
    title: 'Pharmacist Medicine Review',
    shortTitle: 'Medicine review',
    category: 'Pharmacy',
    expertTypes: [ProviderType.PHARMACIST],
    summary:
      'Medicine review for dosage questions, interactions, adherence, side effects, storage, and refill planning.',
    description:
      'Discuss current medicines and concerns to improve clarity and identify questions to ask your treating doctor.',
    priceInPaise: 39900,
    compareAtPriceInPaise: 69900,
    durationMinutes: 20,
    tags: ['medicine', 'pharmacist', 'side effects', 'adherence'],
    relatedDiseaseSlugs: ['medicine-review'],
    sortOrder: 700
  },
  {
    slug: 'nurse-home-care-guidance',
    title: 'Nurse and Home Care Guidance',
    shortTitle: 'Home care guidance',
    category: 'Home Care',
    expertTypes: [ProviderType.NURSE, ProviderType.CAREGIVER, ProviderType.HOME_CARE_PROVIDER],
    summary:
      'Guidance for home care routines, vitals tracking, wound care basics, elder support, and post-illness recovery.',
    description:
      'Plan safer home support, monitoring, and escalation steps with a nurse or home care professional.',
    priceInPaise: 59900,
    compareAtPriceInPaise: 89900,
    durationMinutes: 25,
    tags: ['home care', 'nursing', 'elder care', 'recovery'],
    relatedDiseaseSlugs: ['home-care', 'elder-care'],
    sortOrder: 800
  },
  {
    slug: 'yoga-wellness-consultation',
    title: 'Yoga and Wellness Consultation',
    shortTitle: 'Yoga wellness',
    category: 'Wellness',
    expertTypes: [
      ProviderType.YOGA_INSTRUCTOR,
      ProviderType.WELLNESS_COACH,
      ProviderType.HEALTH_COACH
    ],
    summary:
      'Personalised yoga, breathing, stress management, sleep routine, flexibility, and preventive wellness guidance.',
    description:
      'Build a safe, practical routine based on your age, health status, goals, and current activity level.',
    priceInPaise: 59900,
    compareAtPriceInPaise: 89900,
    durationMinutes: 30,
    tags: ['yoga', 'wellness', 'stress', 'sleep', 'breathing'],
    relatedDiseaseSlugs: ['stress', 'sleep-problems'],
    sortOrder: 900
  },
  {
    slug: 'fitness-coaching-consultation',
    title: 'Fitness Coaching Consultation',
    shortTitle: 'Fitness coaching',
    category: 'Wellness',
    expertTypes: [ProviderType.FITNESS_TRAINER, ProviderType.HEALTH_COACH],
    summary:
      'Fitness guidance for beginners, weight goals, stamina, strength, posture, and safe activity planning.',
    description:
      'Discuss your fitness level, constraints, goals, and medical considerations to create a realistic routine.',
    priceInPaise: 59900,
    compareAtPriceInPaise: 89900,
    durationMinutes: 30,
    tags: ['fitness', 'strength', 'stamina', 'weight'],
    relatedDiseaseSlugs: ['fitness', 'obesity'],
    sortOrder: 910
  },
  {
    slug: 'health-coach-consultation',
    title: 'Health Coach Consultation',
    shortTitle: 'Health coach',
    category: 'Coaching',
    expertTypes: [ProviderType.HEALTH_COACH, ProviderType.WELLNESS_COACH],
    summary:
      'Coaching for habit change, routine building, sleep, stress, follow-up adherence, and lifestyle goals.',
    description:
      'Create a realistic weekly plan and accountability structure for sustainable health routines.',
    priceInPaise: 59900,
    compareAtPriceInPaise: 89900,
    durationMinutes: 30,
    tags: ['health coach', 'habits', 'lifestyle', 'routine'],
    relatedDiseaseSlugs: ['stress', 'sleep-problems', 'obesity'],
    sortOrder: 920
  },
  {
    slug: 'genetic-counselling',
    title: 'Genetic Counselling',
    shortTitle: 'Genetic counselling',
    category: 'Specialty Care',
    expertTypes: [ProviderType.GENETIC_COUNSELLOR, ProviderType.SPECIALIST],
    summary:
      'Guidance for family history, inherited risk, genetic test decisions, reports, and referral planning.',
    description:
      'Discuss family history and reports to understand when genetic testing or specialist care may be appropriate.',
    priceInPaise: 149900,
    compareAtPriceInPaise: 199900,
    durationMinutes: 45,
    tags: ['genetic counselling', 'family history', 'risk', 'reports'],
    relatedDiseaseSlugs: ['genetic-counselling'],
    sortOrder: 1000
  }
];

const subCategoryBySlug: Record<string, string> = {
  'general-health-consultation': 'General Physician',
  'chronic-care-consultation': 'Long-Term Condition Care',
  'skin-hair-consultation': 'Dermatology and Hair',
  'women-health-consultation': "Women's Health",
  'child-health-consultation': 'Child Health',
  'psychologist-consultation': 'Psychology',
  'clinical-psychologist-consultation': 'Clinical Psychology',
  'child-psychologist-consultation': 'Child Psychology',
  'counselling-session': 'General Counselling',
  'relationship-family-counselling': 'Relationship and Family',
  'career-counselling': 'Career Counselling',
  'addiction-counselling': 'Addiction Support',
  'psychiatrist-consultation': 'Psychiatry',
  'ayurveda-consultation': 'Ayurveda',
  'homeopathy-consultation': 'Homeopathy',
  'dietitian-nutrition-consult': 'Dietitian and Nutritionist',
  'weight-management-consultation': 'Weight Management',
  'diabetes-education-consultation': 'Diabetes Education',
  'physiotherapy-consultation': 'Physiotherapy',
  'occupational-therapy-consultation': 'Occupational Therapy',
  'speech-therapy-consultation': 'Speech Therapy',
  'dental-consultation': 'Dental Care',
  'lab-report-review': 'Lab Reports',
  'imaging-report-review': 'Imaging Reports',
  'pharmacist-medicine-review': 'Medicine Review',
  'nurse-home-care-guidance': 'Nursing and Home Care',
  'yoga-wellness-consultation': 'Yoga and Mindfulness',
  'fitness-coaching-consultation': 'Fitness Training',
  'health-coach-consultation': 'Health Coaching',
  'genetic-counselling': 'Genetic Counselling'
};

function json(value: unknown) {
  return value as never;
}

let created = 0;
let updated = 0;

try {
  for (const service of services) {
    const existing = await prisma.healthService.findUnique({ where: { slug: service.slug } });
    await prisma.healthService.upsert({
      where: { slug: service.slug },
      create: {
        id: `svc-${service.slug}`,
        slug: service.slug,
        title: service.title,
        shortTitle: service.shortTitle,
        category: service.category,
        subCategory: subCategoryBySlug[service.slug] ?? service.category,
        expertTypes: service.expertTypes,
        summary: service.summary,
        description: service.description,
        priceInPaise: service.priceInPaise,
        compareAtPriceInPaise: service.compareAtPriceInPaise ?? null,
        durationMinutes: service.durationMinutes,
        tags: service.tags,
        includes: json(commonIncludes),
        outcomes: json(commonOutcomes),
        whoIsItFor: json([
          'Patients or families looking for planned online guidance',
          'Non-emergency health concerns suitable for online care'
        ]),
        howItWorks: json([
          'Choose the service',
          'Share a short intake',
          'Consult online',
          'Receive next steps and follow-up guidance'
        ]),
        faqs: json([
          {
            question: 'Is this for emergencies?',
            answer: 'No. Emergency or severe symptoms need immediate local medical care.'
          }
        ]),
        relatedDiseaseSlugs: service.relatedDiseaseSlugs ?? [],
        seoTitle: `${service.title} | HopeHub Care`,
        seoDescription: service.summary,
        isPublished: true,
        isFeatured: service.isFeatured ?? false,
        sortOrder: service.sortOrder
      },
      update: {
        title: service.title,
        shortTitle: service.shortTitle,
        category: service.category,
        subCategory: subCategoryBySlug[service.slug] ?? service.category,
        expertTypes: service.expertTypes,
        summary: service.summary,
        description: service.description,
        priceInPaise: service.priceInPaise,
        compareAtPriceInPaise: service.compareAtPriceInPaise ?? null,
        durationMinutes: service.durationMinutes,
        tags: service.tags,
        includes: json(commonIncludes),
        outcomes: json(commonOutcomes),
        whoIsItFor: json([
          'Patients or families looking for planned online guidance',
          'Non-emergency health concerns suitable for online care'
        ]),
        howItWorks: json([
          'Choose the service',
          'Share a short intake',
          'Consult online',
          'Receive next steps and follow-up guidance'
        ]),
        faqs: json([
          {
            question: 'Is this for emergencies?',
            answer: 'No. Emergency or severe symptoms need immediate local medical care.'
          }
        ]),
        relatedDiseaseSlugs: service.relatedDiseaseSlugs ?? [],
        seoTitle: `${service.title} | HopeHub Care`,
        seoDescription: service.summary,
        isPublished: true,
        isFeatured: service.isFeatured ?? false,
        sortOrder: service.sortOrder
      }
    });
    if (existing) updated += 1;
    else created += 1;
  }

  console.log(
    `Health services seeded: ${created} created, ${updated} updated, ${services.length} total in seed.`
  );
} finally {
  await prisma.$disconnect();
}
