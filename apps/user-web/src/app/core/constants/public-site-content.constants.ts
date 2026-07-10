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
  name: 'Vitalis Care and Research Centre',
  shortName: 'Vitalis Care',
  footerTagline: 'Doctor-led homeopathic consultations for acute, chronic, and preventive care.',
  seo: {
    defaultTitle: 'Vitalis Care | Doctor-Led Homeopathy for All Conditions',
    defaultDescription:
      'Vitalis Care offers doctor-led online homeopathic consultations for acute and chronic conditions — prescriptions, follow-up, and secure digital care.',
  },
} as const;

export const FOOTER_NAV_LINKS: readonly PublicNavLink[] = [
  { label: 'About us', href: '/about' },
  { label: 'Our doctors', href: '/our-doctors' },
  { label: 'All treatments', href: '/treatments' },
  { label: 'Why Vitalis', href: '/why-successful' },
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
  { value: '12+', label: 'Experienced doctors' },
  { value: '4.8★', label: 'Patient rating' },
  { value: '92%', label: 'Follow-up compliance' },
];

export const HOME_CONTENT = {
  hero: {
    eyebrow: 'Doctor-led homeopathy',
    headline: 'Personalised homeopathic care for every health concern.',
    lead: 'Acute illnesses, chronic conditions, skin and hair issues, digestive problems, allergies, mental wellness, and more — consult qualified homeopathic doctors online with prescriptions and follow-up.',
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
  trustItems: ['Licensed doctors', 'Secure & private', 'Follow-up included'] as const,
  treatmentCards: [
    {
      badge: 'Complete care',
      badgeVariant: 'primary',
      icon: '🩺',
      title: 'Homeopathy for all conditions',
      body: 'From fever, cough, and infections to diabetes, arthritis, skin disorders, and mental health — our doctors treat the full range of acute and chronic illnesses with individualized homeopathic prescribing.',
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
        'Doctor-matched to your case',
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
        title: 'Doctor reviews & plans',
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
    eyebrow: 'Why Vitalis Care and Research Centre',
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
        title: 'Doctor continuity',
        body: 'Same doctor follows your case through the entire care journey.',
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
    title: 'Start your homeopathic consultation today.',
    body: 'Book online for any health concern, or chat with us on WhatsApp — our team will guide you to the right doctor.',
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
      body: 'Learn about doctor assignment, consultation flow, and prescriptions before booking.',
      linkLabel: 'View FAQ',
      linkHref: '/faq',
    },
  },
} as const;

export const ABOUT_CONTENT = {
  page: {
    headerSubtitle: 'About our care',
    eyebrow: 'Who we are',
    title: 'We are a doctor-led homeopathic clinic for patients of all ages and conditions.',
    body: 'Vitalis Care and Research Centre brings structured online homeopathic care under one trusted clinic brand. Patients choose their health concern, share symptoms, and our internal doctor panel guides the full treatment journey — from first consultation to prescription and follow-up.',
  },
  pillars: [
    {
      eyebrow: 'What we do',
      title: 'Personalized online consultations',
      body: "We help patients with acute illnesses, chronic diseases, skin and hair concerns, allergies, digestive issues, women's and children's health, mental wellness, and more. Our focus is individualized homeopathic treatment with continuity — not one-time advice.",
    },
    {
      eyebrow: 'Our approach',
      title: 'Homeopathy-led, less-medicine care',
      body: "We prefer gentle, individualized care with a homeopathy-first mindset where appropriate. Our goal is to reduce unnecessary medication load and support the body's long-term healing process.",
    },
    {
      eyebrow: 'Our expertise',
      title: 'Whole-person homeopathic care',
      body: 'Every case is reviewed as a whole — symptoms, constitution, triggers, and history — so treatment fits the person, not just the disease label. This applies whether your concern is new, recurring, or long-standing.',
    },
  ] satisfies readonly PublicContentPanel[],
  mission: {
    title: 'Mission',
    body: 'To make trusted, affordable, doctor-led care accessible for patients who need thoughtful treatment, follow-up, and long-term support.',
  },
  vision: {
    title: 'Vision',
    body: 'To build a digital homeopathic clinic known for results, trust, ethical care, and gentle individualized treatment across all health conditions.',
  },
  valuesEyebrow: 'What patients can expect',
  values: [
    'Short symptom intake',
    'Internal doctor assignment',
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
  title: 'Homeopathic treatment for acute, chronic, and everyday health concerns.',
  body: 'Vitalis Care and Research Centre offers doctor-led online consultations across all disease categories. Choose your concern, share your symptoms, and receive individualized homeopathic care with follow-up support.',
  categoryEyebrow: 'Select by body part',
  subSectionEyebrow: 'Sub section',
  issueEyebrow: 'Select issue',
  issueSelectionEyebrow: 'Selected issue',
  issueSelectionBody:
    'Continue to consultation and share symptoms for this issue with our doctor panel.',
  issueSelectionCta: 'Start consultation',
  emptyTitle: 'No diseases listed yet',
  emptyBody: 'We will add conditions for this body-part category soon.',
} as const;

export const CHRONIC_CARE_PAGE_CONTENT = {
  headerSubtitle: 'All treatments',
  eyebrow: 'Comprehensive homeopathy',
  title: 'Acute, chronic, and preventive care across every disease category.',
  body: 'Homeopathy treats the person as a whole. Whether your concern is recent or long-standing, our doctors take detailed history, match the right remedy, and support you through follow-up until you recover.',
  ctaLabel: 'Browse all conditions',
  ctaHref: '/treatments',
  pillars: [
    {
      title: 'Any condition',
      body: 'From fever and infections to diabetes, arthritis, skin, hair, and mental health.',
    },
    {
      title: 'Individualized care',
      body: 'Remedy selection based on your full symptom picture and constitution.',
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
  title: 'Evidence-informed articles on homeopathy, common diseases, and healthy living.',
  body: 'Our clinical team shares practical, plain-language insights to help patients understand their conditions, make informed decisions, and support their care between consultations.',
} as const;

export const TESTIMONIALS_PAGE_CONTENT = {
  headerSubtitle: 'Patient stories',
  eyebrow: 'Patient stories',
  title: 'Real results from patients who chose a different path.',
  body: 'These are real experiences from patients who consulted Vitalis Care and Research Centre for a wide range of health concerns and found relief through structured, doctor-led homeopathic care.',
  cta: {
    eyebrow: 'Your story could be next',
    title: 'Start your care journey today.',
    body: 'Book a consultation for any health concern and let our clinical team guide you with individualized homeopathic care and follow-up.',
  },
} as const;

export const OUR_DOCTORS_PAGE_CONTENT = {
  headerSubtitle: 'Our doctors',
  eyebrow: 'Our clinical team',
  title: 'Experienced doctors. Dedicated to patient care.',
  body: 'Vitalis Care and Research Centre maintains an internal panel of qualified homeopathic doctors with expertise across acute illnesses, chronic diseases, skin and hair concerns, metabolic health, pediatrics, and more. Patients are matched to doctors based on their condition — not random browsing.',
  matching: {
    eyebrow: 'How it works',
    title: 'You do not choose a doctor — we match you to the right one.',
    body: 'At Vitalis, doctor assignment is internal. This ensures patients with specific conditions receive care from the most qualified and available doctor on our panel, rather than being left to navigate listings alone.',
  },
  cta: {
    eyebrow: 'Ready to start?',
    title: 'Book a consultation today.',
    body: 'Describe your concern, complete a short intake, and our team will assign the right doctor and guide you through the consultation process.',
  },
} as const;

export const CAREERS_PAGE_CONTENT = {
  headerSubtitle: 'Careers',
  eyebrow: 'Join our team',
  title: 'Build your career at a clinic that puts patient care first.',
  body: 'Vitalis Care and Research Centre is a doctor-led homeopathic clinic serving patients with acute, chronic, and preventive health needs. We are growing our clinical, care, pharmacy, and operations teams. If you want to do meaningful work in healthcare, we would like to hear from you.',
  applyLabel: 'Apply on WhatsApp',
  perksEyebrow: 'Why work with us',
  perksTitle: 'What makes Vitalis a good place to grow.',
  perks: [
    {
      label: 'Purpose-driven work',
      detail: 'Help patients across all health concerns find lasting relief through homeopathy.',
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
      detail: 'We prioritise gentle, individualized treatment and long-term patient wellbeing.',
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
    seoTitle: 'Vitalis Care | Doctor-Led Homeopathy for All Conditions',
    seoDescription:
      'Book online homeopathic consultations for any health concern. Licensed doctors, prescriptions, follow-up, and secure patient support.',
  },
  about: {
    seoTitle: 'About Vitalis Care and Research Centre | Doctor-Led Homeopathy',
    seoDescription:
      'Learn about Vitalis Care — a doctor-led homeopathic clinic offering online consultations for acute, chronic, and preventive care across all conditions.',
  },
  treatments: {
    seoTitle: 'Treatments | Vitalis Care and Research Centre',
    seoDescription:
      'Explore homeopathic treatment at Vitalis Care for acute and chronic conditions across all body systems and age groups.',
  },
  'treatments/:slug': {
    seoTitle: 'Treatment Details | Vitalis Care',
    seoDescription:
      'Read treatment details, common symptoms, care approach, and safety guidance at Vitalis Care.',
  },
  'our-doctors': {
    seoTitle: 'Our Doctors | Vitalis Care and Research Centre',
    seoDescription:
      'Meet qualified homeopathic doctors at Vitalis Care. Our internal clinical team is matched to patients based on their condition for personalised care.',
  },
  blog: {
    seoTitle: 'Health Blog | Vitalis Care and Research Centre',
    seoDescription:
      'Evidence-informed articles on homeopathy, common diseases, mental wellness, and healthy living from the Vitalis Care clinical team.',
  },
  testimonials: {
    seoTitle: 'Patient Stories | Vitalis Care and Research Centre',
    seoDescription:
      'Read real patient experiences from Vitalis Care — doctor-led homeopathic care for a wide range of health concerns.',
  },
  careers: {
    seoTitle: 'Careers | Vitalis Care and Research Centre',
    seoDescription:
      'Join the Vitalis Care team. We are hiring homeopathic doctors, care coordinators, pharmacists, and operations staff who are passionate about patient-first healthcare.',
  },
  'chronic-care': {
    seoTitle: 'Homeopathic Treatment | Vitalis Care',
    seoDescription:
      'Comprehensive homeopathic care at Vitalis Care for acute, chronic, and preventive treatment across all disease categories.',
  },
  faq: {
    seoTitle: 'FAQ | Vitalis Care',
    seoDescription:
      'Frequently asked questions about consultations, treatment flow, and patient support at Vitalis Care.',
  },
  'why-successful': {
    seoTitle: 'Why Vitalis Works | Vitalis Care',
    seoDescription:
      'See how Vitalis Care combines structured case-taking, method-led decision making, and disciplined follow-up.',
  },
  contact: {
    seoTitle: 'Contact | Vitalis Care',
    seoDescription: 'Contact Vitalis Care for consultation help, guidance, and patient support.',
  },
  'privacy-terms': {
    seoTitle: 'Privacy and Terms | Vitalis Care',
    seoDescription:
      'Read the Vitalis Care privacy policy and terms for consultations, data use, and platform usage.',
  },
  legal: {
    seoTitle: 'Legal & Policies | Vitalis Care',
    seoDescription:
      'Privacy policy, terms and conditions, return and exchange, shipping, and payment policies for Vitalis Care.',
  },
  'privacy-policy': {
    seoTitle: 'Privacy Policy | Vitalis Care',
    seoDescription:
      'Learn how Vitalis Care collects, uses, and protects your personal and health information.',
  },
  'terms-and-conditions': {
    seoTitle: 'Terms & Conditions | Vitalis Care',
    seoDescription:
      'Terms for using Vitalis Care online consultations, prescriptions, and medicine orders.',
  },
  'return-and-exchange-policy': {
    seoTitle: 'Return & Exchange Policy | Vitalis Care',
    seoDescription:
      'Return, replacement, and refund rules for medicine orders placed through Vitalis Care.',
  },
  'shipping-policy': {
    seoTitle: 'Shipping Policy | Vitalis Care',
    seoDescription:
      'Medicine delivery timelines, serviceable areas, and shipping charges at Vitalis Care.',
  },
  'payment-policy': {
    seoTitle: 'Payment Policy | Vitalis Care',
    seoDescription:
      'Consultation fees, payment methods, refunds, and billing information for Vitalis Care.',
  },
  safety: {
    seoTitle: 'Safety and Trust | Vitalis Care',
    seoDescription:
      'Review safety guidance, medical disclaimers, and emergency-care boundaries for Vitalis Care consultations.',
  },
  'get-app': {
    seoTitle: 'Download Vitalis Patient App',
    seoDescription:
      'Scan the QR code to install the Vitalis patient app. No account required to download.',
  },
  'patient/dashboard': {
    seoTitle: 'Patient Dashboard | Vitalis Care',
    seoDescription:
      'Manage your consultations, messages, and prescriptions in the Vitalis Care patient dashboard.',
  },
  'patient/account': {
    seoTitle: 'My Account | Vitalis Care',
    seoDescription: 'View your account summary, profile, and delivery addresses.',
  },
  'patient/account/profile': {
    seoTitle: 'Edit Account | Vitalis Care',
    seoDescription: 'Update your profile, health details, notifications, and password.',
  },
  'patient/account/addresses': {
    seoTitle: 'Manage Addresses | Vitalis Care',
    seoDescription: 'Save and manage delivery addresses for medicine orders.',
  },
  'patient/account/refer': {
    seoTitle: 'Refer and Earn | Vitalis Care',
    seoDescription: 'Invite friends to Vitalis Care and earn wallet rewards.',
  },
  'patient/account/rewards': {
    seoTitle: 'Rewards Wallet | Vitalis Care',
    seoDescription: 'View your Vitalis Care wallet balance and reward history.',
  },
  'patient/account/consultations': {
    seoTitle: 'My Consultations | Vitalis Care',
    seoDescription: 'View consultation history and complete pending payments.',
  },
  'patient/account/orders': {
    seoTitle: 'Orders & Deliveries | Vitalis Care',
    seoDescription: 'Track medicine delivery orders and status.',
  },
  'patient/account/lab-results': {
    seoTitle: 'Lab Results | Vitalis Care',
    seoDescription: 'View diagnostic referrals and completed lab test results.',
  },
  'patient/account/card': {
    seoTitle: 'My Clinic Card | Vitalis Care',
    seoDescription: 'Your patient ID card and QR code for clinic visits.',
  },
  'doctor/dashboard': {
    seoTitle: 'Doctor Dashboard | Vitalis Care',
    seoDescription:
      'Review assigned consultations, patient chats, and prescriptions in the Vitalis Care doctor dashboard.',
  },
  'admin/dashboard': {
    seoTitle: 'Admin Dashboard | Vitalis Care',
    seoDescription:
      'Manage clinic operations, doctor assignment, and reporting in the Vitalis Care admin dashboard.',
  },
} as const;
