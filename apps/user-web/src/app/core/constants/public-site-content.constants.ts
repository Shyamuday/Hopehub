/** Single source of truth for public marketing copy — edit here to update the patient app UI. */

export type PublicNavLink = { label: string; href: string };

export type PublicPageHero = {
  headerSubtitle: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type PublicContentCard = {
  badge: string;
  badgeVariant?: 'primary' | 'secondary';
  icon: string;
  title: string;
  body: string;
  features: readonly string[];
  linkLabel: string;
  linkHref: string;
};

export type PublicContentStep = {
  number: number;
  icon: string;
  title: string;
  body: string;
};

export type PublicContentBenefit = {
  icon: string;
  title: string;
  body: string;
};

export type PublicContentPanel = {
  eyebrow?: string;
  title: string;
  body: string;
};

export const PUBLIC_SITE_BRAND = {
  name: 'HopeHub Care and Research Centre',
  shortName: 'HopeHub Care',
  footerTagline:
    'Provider-led online healthcare consultations for acute, chronic, and preventive care.',
  seo: {
    defaultTitle: 'HopeHub Care | Provider-Led Healthcare for All Conditions',
    defaultDescription:
      'HopeHub Care offers provider-led online healthcare consultations for acute and chronic conditions - prescriptions where appropriate, follow-up, and secure digital care.',
  },
} as const;

export const FOOTER_NAV_LINKS: readonly PublicNavLink[] = [
  { label: 'About us', href: '/about' },
  { label: 'Our Providers', href: '/our-providers' },
  { label: 'All treatments', href: '/treatments' },
  { label: 'Why HopeHub', href: '/why-successful' },
  { label: 'Patient stories', href: '/testimonials' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Get the app', href: '/get-app' },
  { label: 'Contact', href: '/contact' },
  { label: 'Careers', href: '/careers' },
  { label: 'Legal & policies', href: '/legal' },
  { label: 'Safety', href: '/safety' },
] as const;

export type PublicStat = { value: string; label: string };

export const HOME_STATS_FALLBACK: readonly PublicStat[] = [
  { value: '5,000+', label: 'Consultations completed' },
  { value: '12+', label: 'Experienced providers' },
  { value: '4.8★', label: 'Patient rating' },
  { value: '92%', label: 'Follow-up compliance' },
];

export const HOME_CONTENT = {
  hero: {
    eyebrow: 'Provider-led healthcare',
    headline: 'Personalised care for every health concern.',
    lead: 'Acute illnesses, chronic conditions, skin and hair issues, digestive problems, allergies, mental wellness, nutrition, rehabilitation, and more - consult qualified healthcare providers online with guidance, prescriptions where appropriate, and follow-up.',
  },
  booking: {
    formTitle: 'Book consultation',
    formSubtitle: 'Verify your email now. You can choose clinic and health concern after login.',
    diseaseLabel: 'Health concern',
    diseasePlaceholder: 'Select a condition',
    diseaseLoadingLabel: 'Loading conditions…',
    diseaseBrowseLabel: 'Browse all treatments',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter your Gmail',
    submitLabel: 'Continue',
    submittingLabel: 'Sending OTP…',
    hint: 'Secure email OTP login. No password needed.',
    otpTitle: 'Verify email',
    otpLabel: 'Enter OTP',
    otpPlaceholder: '6-digit OTP',
    verifyLabel: 'Continue',
    verifyingLabel: 'Verifying…',
    backLabel: '← Change email',
    loadingLabel: 'Setting up your account…',
    doneLabel: 'Verified. Taking you to your dashboard…',
  },
  trustItems: ['Licensed providers', 'Secure & private', 'Follow-up included'] as const,
  treatmentCards: [
    {
      badge: 'Complete care',
      badgeVariant: 'primary',
      icon: '🩺',
      title: 'Care for all health concerns',
      body: 'From fever, cough, and infections to diabetes, arthritis, skin disorders, mental health, nutrition, and rehabilitation - our providers support a wide range of acute and chronic needs with personalized care.',
      features: ['Acute & chronic complaints', 'All age groups', 'Prescription & follow-up'],
      linkLabel: 'Browse all conditions →',
      linkHref: '/treatments',
    },
    {
      badge: 'Find your concern',
      badgeVariant: 'secondary',
      icon: '💊',
      title: 'Search by body system',
      body: "Explore conditions by category — respiratory, digestive, skin, hair, women's health, children's health, and more — then start a consultation for your specific issue.",
      features: [
        'Organ-wise categories',
        'Common & rare conditions',
        'Provider-matched to your case',
      ],
      linkLabel: 'Find your treatment →',
      linkHref: '/treatments',
    },
  ] satisfies readonly PublicContentCard[],
  howItWorks: {
    eyebrow: 'How it works',
    title: 'Simple, structured care in 3 steps',
    subtitle: 'No rushed appointments. No repeated explanations. Just methodical care.',
    steps: [
      {
        number: 1,
        icon: '📋',
        title: 'Share your history',
        body: 'Complete a structured intake covering duration, triggers, past treatments, and symptom patterns.',
      },
      {
        number: 2,
        icon: '👨‍⚕️',
        title: 'Provider reviews & plans',
        body: 'Our panel reviews your case thoroughly and creates a personalized care pathway.',
      },
      {
        number: 3,
        icon: '📈',
        title: 'Ongoing follow-up',
        body: 'Track progress with secure messaging, prescription updates, and scheduled check-ins.',
      },
    ] satisfies readonly PublicContentStep[],
  },
  whyChoose: {
    eyebrow: 'Why HopeHub Care and Research Centre',
    title: 'Built for lasting results, not quick fixes',
    benefits: [
      {
        icon: '🔒',
        title: 'Private & secure',
        body: 'End-to-end encrypted consultations with strict data privacy.',
      },
      {
        icon: '📊',
        title: 'Pattern tracking',
        body: 'We track symptom patterns over time, not just single episodes.',
      },
      {
        icon: '🩺',
        title: 'Provider continuity',
        body: 'The right provider or care team follows your case through the entire care journey.',
      },
      {
        icon: '📱',
        title: 'Easy follow-ups',
        body: 'Secure chat and scheduled check-ins without rebooking fees.',
      },
    ] satisfies readonly PublicContentBenefit[],
  },
  cta: {
    eyebrow: 'Ready to start?',
    title: 'Start your consultation today.',
    body: 'Book online for any health concern, or chat with us on WhatsApp - our team will guide you to the right provider.',
    primaryLabel: 'Book consultation',
  },
  safetyFaq: {
    safety: {
      title: 'Safety first',
      body: 'This platform is not for emergencies. Severe pain, breathing trouble, heavy bleeding, or sudden worsening symptoms require immediate offline medical care.',
      linkLabel: 'Read full safety guidance',
      linkHref: '/safety',
    },
    faq: {
      title: 'Common questions',
      body: 'Learn about provider assignment, consultation flow, and prescriptions before booking.',
      linkLabel: 'View FAQ',
      linkHref: '/faq',
    },
  },
} as const;

export const ABOUT_CONTENT = {
  page: {
    headerSubtitle: 'About our care',
    eyebrow: 'Who we are',
    title: 'We are a provider-led healthcare platform for patients of all ages and concerns.',
    body: 'HopeHub Care and Research Centre brings structured online care under one trusted clinic brand. Patients choose their health concern, share symptoms, and our internal provider panel guides the full journey - from first consultation to care plan and follow-up.',
  },
  pillars: [
    {
      eyebrow: 'What we do',
      title: 'Personalized online consultations',
      body: "We help patients with acute illnesses, chronic diseases, skin and hair concerns, allergies, digestive issues, women's and children's health, mental wellness, nutrition, rehabilitation, and more. Our focus is individualized care with continuity - not one-time advice.",
    },
    {
      eyebrow: 'Our approach',
      title: 'Personalized, lower-burden care',
      body: 'We prefer thoughtful, individualized care with the right provider and approach for each patient. Our goal is to reduce unnecessary treatment load and support long-term wellbeing.',
    },
    {
      eyebrow: 'Our expertise',
      title: 'Whole-person healthcare',
      body: 'Every case is reviewed as a whole - symptoms, triggers, history, lifestyle, and goals - so care fits the person, not just the disease label. This applies whether your concern is new, recurring, or long-standing.',
    },
  ] satisfies readonly PublicContentPanel[],
  mission: {
    title: 'Mission',
    body: 'To make trusted, affordable, Provider-Led care accessible for patients who need thoughtful treatment, follow-up, and long-term support.',
  },
  vision: {
    title: 'Vision',
    body: 'To build a digital healthcare platform known for results, trust, ethical care, and individualized support across health conditions.',
  },
  valuesEyebrow: 'What patients can expect',
  values: [
    'Short symptom intake',
    'Internal provider assignment',
    'Private chat consultation',
    'Prescription and follow-up guidance',
    'Case history & follow-up',
    'WhatsApp support',
  ] as const,
  cta: {
    eyebrow: 'Need help choosing?',
    title: 'Talk to us before booking.',
    body: 'Message us on WhatsApp and our team will guide you to the right consultation path.',
  },
} as const;

export const TREATMENTS_PAGE_CONTENT = {
  headerSubtitle: 'Treatments',
  eyebrow: 'Treatments',
  title: 'Care for acute, chronic, and everyday health concerns.',
  body: 'HopeHub Care and Research Centre offers provider-led online consultations across disease categories and provider types. Choose your concern, share your symptoms, and receive personalized care with follow-up support.',
  categoryEyebrow: 'Select by body part',
  subSectionEyebrow: 'Sub section',
  issueEyebrow: 'Select issue',
  issueSelectionEyebrow: 'Selected issue',
  issueSelectionBody:
    'Continue to consultation and share symptoms for this issue with our provider panel.',
  issueSelectionCta: 'Start consultation',
  emptyTitle: 'No diseases listed yet',
  emptyBody: 'We will add conditions for this body-part category soon.',
} as const;

export const CHRONIC_CARE_PAGE_CONTENT = {
  headerSubtitle: 'All treatments',
  eyebrow: 'Comprehensive care',
  title: 'Acute, chronic, and preventive care across every disease category.',
  body: 'Whether your concern is recent or long-standing, our providers take detailed history, match the right care approach, and support you through follow-up.',
  ctaLabel: 'Browse all conditions',
  ctaHref: '/treatments',
  pillars: [
    {
      title: 'Any condition',
      body: 'From fever and infections to diabetes, arthritis, skin, hair, and mental health.',
    },
    {
      title: 'Individualized care',
      body: 'Care plans are based on your full symptom picture, history, goals, and provider assessment.',
    },
    {
      title: 'Ongoing support',
      body: 'Prescriptions, medicine delivery, and follow-up consultations when you need them.',
    },
  ] satisfies readonly PublicContentPanel[],
} as const;

export const BLOG_PAGE_CONTENT = {
  headerSubtitle: 'Health blog',
  eyebrow: 'Health & care insights',
  title: 'Evidence-informed articles on common diseases, mental wellness, and healthy living.',
  body: 'Our provider team shares practical, plain-language insights to help patients understand their conditions, make informed decisions, and support their care between consultations.',
} as const;

export const TESTIMONIALS_PAGE_CONTENT = {
  headerSubtitle: 'Patient stories',
  eyebrow: 'Patient stories',
  title: 'Real results from patients who chose a different path.',
  body: 'These are real experiences from patients who consulted HopeHub Care and Research Centre for a wide range of health concerns and found support through structured, provider-led care.',
  cta: {
    eyebrow: 'Your story could be next',
    title: 'Start your care journey today.',
    body: 'Book a consultation for any health concern and let our provider team guide you with individualized care and follow-up.',
  },
} as const;

export const OUR_DOCTORS_PAGE_CONTENT = {
  headerSubtitle: 'Our Providers',
  eyebrow: 'Our provider team',
  title: 'Experienced providers. Dedicated to patient care.',
  body: 'HopeHub Care and Research Centre maintains an internal panel of qualified healthcare providers across acute care, chronic disease support, mental wellness, skin and hair, metabolic health, pediatrics, nutrition, rehabilitation, and more. Patients are matched to providers based on their concern - not random browsing.',
  matching: {
    eyebrow: 'How it works',
    title: 'You do not choose alone - we match you to the right provider.',
    body: 'At HopeHub, provider assignment is internal. This helps patients receive care from the most qualified and available provider on our panel, rather than being left to navigate listings alone.',
  },
  cta: {
    eyebrow: 'Ready to start?',
    title: 'Book a consultation today.',
    body: 'Describe your concern, complete a short intake, and our team will assign the right provider and guide you through the consultation process.',
  },
} as const;

export const CAREERS_PAGE_CONTENT = {
  headerSubtitle: 'Careers',
  eyebrow: 'Join our team',
  title: 'Build your career at a clinic that puts patient care first.',
  body: 'HopeHub Care and Research Centre is a provider-led healthcare platform serving patients with acute, chronic, mental wellness, preventive, and supportive care needs. We are growing our clinical, counselling, care, pharmacy, and operations teams. If you want to do meaningful work in healthcare, we would like to hear from you.',
  applyLabel: 'Apply on WhatsApp',
  perksEyebrow: 'Why work with us',
  perksTitle: 'What makes HopeHub a good place to grow.',
  perks: [
    {
      label: 'Purpose-driven work',
      detail:
        'Help patients across health concerns find practical, compassionate, long-term support.',
    },
    {
      label: 'Remote-first culture',
      detail: 'Most roles offer remote or hybrid working arrangements.',
    },
    {
      label: 'Structured growth',
      detail: 'Clear career tracks in clinical, care, and operations roles.',
    },
    {
      label: 'Learning environment',
      detail: 'Internal training, case reviews, and mentorship programs.',
    },
    {
      label: 'Ethical care',
      detail:
        'We prioritise individualized treatment, clear boundaries, and long-term patient wellbeing.',
    },
    {
      label: 'Stable platform',
      detail: 'Modern digital tools with a dependable, growing patient base.',
    },
  ] as const,
} as const;

/** Route-level SEO — keys match `app.routes.ts` path segments. */
export const ROUTE_SEO_CONTENT = {
  home: {
    seoTitle: 'HopeHub Care | Provider-Led Healthcare for All Conditions',
    seoDescription:
      'Book online healthcare consultations for any health concern. Licensed providers, prescriptions where appropriate, follow-up, and secure patient support.',
  },
  about: {
    seoTitle: 'About HopeHub Care and Research Centre | Provider-Led Healthcare',
    seoDescription:
      'Learn about HopeHub Care - a provider-led healthcare platform offering online consultations for acute, chronic, mental wellness, preventive, and supportive care.',
  },
  treatments: {
    seoTitle: 'Treatments | HopeHub Care and Research Centre',
    seoDescription:
      'Explore provider-led care at HopeHub Care for acute and chronic conditions across body systems, age groups, and care needs.',
  },
  'treatments/:slug': {
    seoTitle: 'Treatment Details | HopeHub Care',
    seoDescription:
      'Read treatment details, common symptoms, care approach, and safety guidance at HopeHub Care.',
  },
  'our-doctors': {
    seoTitle: 'Our Providers | HopeHub Care and Research Centre',
    seoDescription:
      'Meet qualified healthcare providers at HopeHub Care. Our internal provider team is matched to patients based on their concern for personalised care.',
  },
  blog: {
    seoTitle: 'Health Blog | HopeHub Care and Research Centre',
    seoDescription:
      'Evidence-informed articles on common diseases, mental wellness, preventive care, and healthy living from the HopeHub Care team.',
  },
  testimonials: {
    seoTitle: 'Patient Stories | HopeHub Care and Research Centre',
    seoDescription:
      'Read real patient experiences from HopeHub Care - provider-led care for a wide range of health concerns.',
  },
  careers: {
    seoTitle: 'Careers | HopeHub Care and Research Centre',
    seoDescription:
      'Join the HopeHub Care team. We are hiring providers, counsellors, care coordinators, pharmacists, and operations staff who are passionate about patient-first healthcare.',
  },
  'chronic-care': {
    seoTitle: 'Provider-Led Care | HopeHub Care',
    seoDescription:
      'Comprehensive provider-led care at HopeHub Care for acute, chronic, mental wellness, preventive, and supportive health needs.',
  },
  faq: {
    seoTitle: 'FAQ | HopeHub Care',
    seoDescription:
      'Frequently asked questions about consultations, treatment flow, and patient support at HopeHub Care.',
  },
  'why-successful': {
    seoTitle: 'Why HopeHub Works | HopeHub Care',
    seoDescription:
      'See how HopeHub Care combines structured case-taking, method-led decision making, and disciplined follow-up.',
  },
  contact: {
    seoTitle: 'Contact | HopeHub Care',
    seoDescription: 'Contact HopeHub Care for consultation help, guidance, and patient support.',
  },
  'privacy-terms': {
    seoTitle: 'Privacy and Terms | HopeHub Care',
    seoDescription:
      'Read the HopeHub Care privacy policy and terms for consultations, data use, and platform usage.',
  },
  legal: {
    seoTitle: 'Legal & Policies | HopeHub Care',
    seoDescription:
      'Privacy policy, terms and conditions, return and exchange, shipping, and payment policies for HopeHub Care.',
  },
  'privacy-policy': {
    seoTitle: 'Privacy Policy | HopeHub Care',
    seoDescription:
      'Learn how HopeHub Care collects, uses, and protects your personal and health information.',
  },
  'terms-and-conditions': {
    seoTitle: 'Terms & Conditions | HopeHub Care',
    seoDescription:
      'Terms for using HopeHub Care online consultations, prescriptions, and medicine orders.',
  },
  'return-and-exchange-policy': {
    seoTitle: 'Return & Exchange Policy | HopeHub Care',
    seoDescription:
      'Return, replacement, and refund rules for medicine orders placed through HopeHub Care.',
  },
  'shipping-policy': {
    seoTitle: 'Shipping Policy | HopeHub Care',
    seoDescription:
      'Medicine delivery timelines, serviceable areas, and shipping charges at HopeHub Care.',
  },
  'payment-policy': {
    seoTitle: 'Payment Policy | HopeHub Care',
    seoDescription:
      'Consultation fees, payment methods, refunds, and billing information for HopeHub Care.',
  },
  safety: {
    seoTitle: 'Safety and Trust | HopeHub Care',
    seoDescription:
      'Review safety guidance, medical disclaimers, and emergency-care boundaries for HopeHub Care consultations.',
  },
  'get-app': {
    seoTitle: 'Download HopeHub Patient App',
    seoDescription:
      'Scan the QR code to install the HopeHub patient app. No account required to download.',
  },
  'patient/dashboard': {
    seoTitle: 'Patient Dashboard | HopeHub Care',
    seoDescription:
      'Manage your consultations, messages, and prescriptions in the HopeHub Care patient dashboard.',
  },
  'patient/account': {
    seoTitle: 'My Account | HopeHub Care',
    seoDescription: 'View your account summary, profile, and delivery addresses.',
  },
  'patient/account/profile': {
    seoTitle: 'Edit Account | HopeHub Care',
    seoDescription: 'Update your profile, health details, notifications, and password.',
  },
  'patient/account/addresses': {
    seoTitle: 'Manage Addresses | HopeHub Care',
    seoDescription: 'Save and manage delivery addresses for medicine orders.',
  },
  'patient/account/refer': {
    seoTitle: 'Refer and Earn | HopeHub Care',
    seoDescription: 'Invite friends to HopeHub Care and earn wallet rewards.',
  },
  'patient/account/rewards': {
    seoTitle: 'Rewards Wallet | HopeHub Care',
    seoDescription: 'View your HopeHub Care wallet balance and reward history.',
  },
  'patient/account/consultations': {
    seoTitle: 'My Consultations | HopeHub Care',
    seoDescription: 'View consultation history and complete pending payments.',
  },
  'patient/account/orders': {
    seoTitle: 'Orders & Deliveries | HopeHub Care',
    seoDescription: 'Track medicine delivery orders and status.',
  },
  'patient/account/lab-results': {
    seoTitle: 'Lab Results | HopeHub Care',
    seoDescription: 'View diagnostic referrals and completed lab test results.',
  },
  'patient/account/card': {
    seoTitle: 'My Clinic Card | HopeHub Care',
    seoDescription: 'Your patient ID card and QR code for clinic visits.',
  },
  'doctor/dashboard': {
    seoTitle: 'provider dashboard | HopeHub Care',
    seoDescription:
      'Review assigned consultations, patient chats, and prescriptions in the HopeHub Care provider dashboard.',
  },
  'admin/dashboard': {
    seoTitle: 'Admin Dashboard | HopeHub Care',
    seoDescription:
      'Manage clinic operations, provider assignment, and reporting in the HopeHub Care admin dashboard.',
  },
} as const;
