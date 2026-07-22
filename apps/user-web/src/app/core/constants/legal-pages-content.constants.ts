/** Legal / policy page copy — edit here to update Privacy, Terms, Returns, Shipping, and Payment pages. */

import type { PublicNavLink } from './public-site-content.constants';

export type LegalSection = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

export type LegalPageContent = {
  slug: string;
  headerSubtitle: string;
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: readonly LegalSection[];
};

export const LEGAL_HUB_CONTENT = {
  headerSubtitle: 'Legal',
  eyebrow: 'Policies',
  title: 'Privacy, terms, and clinic policies.',
  intro:
    'Read how HopeHub Care and Research Centre handles your data, consultations, payments, medicine orders, delivery, and returns.',
  links: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms & Conditions', href: '/terms-and-conditions' },
    { label: 'Return & Exchange Policy', href: '/return-and-exchange-policy' },
    { label: 'Shipping Policy', href: '/shipping-policy' },
    { label: 'Payment Policy', href: '/payment-policy' },
  ] satisfies readonly PublicNavLink[],
} as const;

const CLINIC_NAME = 'HopeHub Care and Research Centre';
const CONTACT_EMAIL = 'support@hopehubcare.in';
const GOVERNING_LAW = 'Jharkhand, India';

export const LEGAL_PAGES = {
  privacy: {
    slug: 'privacy-policy',
    headerSubtitle: 'Privacy Policy',
    eyebrow: 'Privacy Policy',
    title: 'How we collect, use, and protect your information.',
    intro: `${CLINIC_NAME} respects your privacy. This policy explains what personal and health information we collect when you use our website, patient app, consultations, chat, prescriptions, and medicine orders — and how we use it to deliver care.`,
    lastUpdated: 'July 2026',
    sections: [
      {
        title: 'Information we collect',
        bullets: [
          'Account details: name, mobile number, email, date of birth, gender, and login credentials.',
          'Health information: symptoms, consultation history, intake answers, chat messages, prescriptions, lab reports, and follow-up notes.',
          'Address and delivery details for medicine fulfilment.',
          'Payment metadata processed through Razorpay (we do not store full card or UPI credentials on our servers).',
          'Technical data: device type, browser, IP address, cookies, and usage analytics needed to secure and improve the platform.',
        ],
      },
      {
        title: 'How we use your information',
        bullets: [
          'To provide online consultations, provider assignment, prescriptions, reminders, and follow-up care.',
          'To process consultation fees and medicine payments.',
          'To arrange medicine packing, dispatch, and delivery.',
          'To send OTPs, appointment updates, prescription alerts, and service notifications.',
          'To comply with applicable healthcare, tax, and record-keeping requirements.',
          'To improve platform safety, detect fraud, and resolve support requests.',
        ],
      },
      {
        title: 'Medical confidentiality',
        paragraphs: [
          'Consultation and prescription information is shared only with authorised providers, pharmacists, care coordinators, and operations staff who need it to deliver your care.',
          'We do not sell your personal or health data to third-party advertisers.',
        ],
      },
      {
        title: 'Data sharing',
        bullets: [
          'Payment partners such as Razorpay for secure payment processing.',
          'Courier and logistics partners for medicine delivery (name, phone, and delivery address only as needed).',
          'Diagnostic or fulfilment partners when you explicitly request a linked service.',
          'Government or regulatory authorities when required by law.',
        ],
      },
      {
        title: 'Data retention & security',
        paragraphs: [
          'We retain consultation and prescription records as required for continuity of care and applicable regulations. Account data is stored using access controls, encryption in transit where supported, and clinic-operated infrastructure.',
          'You may request correction of inaccurate profile information through patient support.',
        ],
      },
      {
        title: 'Your choices',
        bullets: [
          'You can update profile and address details from your patient dashboard where available.',
          'You may opt out of non-essential promotional messages.',
          'You may contact us to raise privacy questions or report a concern.',
        ],
      },
      {
        title: 'Contact',
        paragraphs: [
          `For privacy-related questions, email ${CONTACT_EMAIL} or contact us through WhatsApp support on the website.`,
        ],
      },
    ],
  },
  terms: {
    slug: 'terms-and-conditions',
    headerSubtitle: 'Terms & Conditions',
    eyebrow: 'Terms & Conditions',
    title: 'Rules for using HopeHub Care online services.',
    intro: `By accessing ${CLINIC_NAME}, creating an account, booking a consultation, or placing a medicine order, you agree to these Terms & Conditions.`,
    lastUpdated: 'July 2026',
    sections: [
      {
        title: 'Nature of service',
        paragraphs: [
          'We provide provider-led online healthcare consultations, digital prescriptions where clinically appropriate, follow-up messaging, and medicine fulfilment support.',
          'Our platform is not an emergency service. Severe or sudden symptoms require immediate offline medical care.',
        ],
      },
      {
        title: 'Eligibility & account',
        bullets: [
          'You must provide accurate registration information.',
          'You are responsible for keeping your login credentials and OTP access secure.',
          'Parents or legal guardians must register and manage accounts for minors.',
        ],
      },
      {
        title: 'Consultations & provider assignment',
        bullets: [
          'Providers are assigned internally based on your concern, availability, and clinic workflow - patients do not browse or select providers from a public marketplace listing.',
          'A consultation fee may apply before provider review or assignment, as shown at booking.',
          'The provider may request additional history, photos, or reports before prescribing or giving care guidance.',
          'Prescriptions are issued only when clinically appropriate.',
        ],
      },
      {
        title: 'Medicines & fulfilment',
        paragraphs: [
          'Medicines prescribed during consultation may be ordered through our platform subject to stock, licensing, and delivery coverage.',
          'You agree to use medicines only as directed by the prescribing provider.',
        ],
      },
      {
        title: 'User conduct',
        bullets: [
          'Do not misuse the platform, submit false information, harass staff or providers, or attempt unauthorised access.',
          'Do not record or redistribute consultation content without consent where prohibited by law.',
          'We may suspend accounts that violate these terms or create safety risks.',
        ],
      },
      {
        title: 'Intellectual property',
        paragraphs: [
          'Website content, branding, workflows, and software are owned by or licensed to the clinic. You may not copy or commercially exploit them without permission.',
        ],
      },
      {
        title: 'Limitation of liability',
        paragraphs: [
          'To the fullest extent permitted by law, the clinic is not liable for indirect or consequential damages arising from platform use, delivery delays outside our control, or failure to seek emergency care when needed.',
          'Nothing in these terms limits rights that cannot be excluded under applicable consumer protection law.',
        ],
      },
      {
        title: 'Governing law',
        paragraphs: [
          `These terms are governed by the laws of ${GOVERNING_LAW}. Disputes shall be subject to the courts at Ranchi, Jharkhand, unless otherwise required by law.`,
        ],
      },
      {
        title: 'Contact',
        paragraphs: [`Questions about these terms: ${CONTACT_EMAIL}`],
      },
    ],
  },
  returnExchange: {
    slug: 'return-and-exchange-policy',
    headerSubtitle: 'Return & Exchange',
    eyebrow: 'Return & Exchange Policy',
    title: 'Returns, replacements, and order issues for medicines.',
    intro:
      'Because medicines are regulated products, returns and exchanges are handled carefully. Please read this policy before placing an order.',
    lastUpdated: 'July 2026',
    sections: [
      {
        title: 'General principle',
        paragraphs: [
          'For patient safety and regulatory compliance, opened, used, or temperature-sensitive homeopathic medicines generally cannot be returned or exchanged once dispatched, except where required by law or where we made a fulfilment error.',
        ],
      },
      {
        title: 'Eligible for return or replacement',
        bullets: [
          'Wrong medicine or wrong potency shipped compared to the approved prescription.',
          'Damaged, leaked, or broken bottle/tube received in transit.',
          'Missing items from a paid order.',
          'Duplicate charge or order created in error by our system.',
        ],
      },
      {
        title: 'Not eligible for return',
        bullets: [
          'Change of mind after dispatch.',
          'Opened or partially used products.',
          'Products stored incorrectly by the customer after delivery.',
          'Delays caused by incorrect address or unavailable recipient.',
          'Prescription items correctly dispensed as per provider order.',
        ],
      },
      {
        title: 'How to report an issue',
        bullets: [
          'Contact support within 48 hours of delivery with your order ID, photos of the package/product, and a brief description.',
          'Our pharmacy team will verify against the prescription and dispatch records.',
          'Approved replacements may be shipped at no extra cost; refunds are issued to the original payment method where applicable.',
        ],
      },
      {
        title: 'Consultation fees',
        paragraphs: [
          'Consultation fee refunds are governed by our Payment Policy and depend on whether the provider has started clinical review, whether the consultation was completed, or whether the case was cancelled due to clinic unavailability.',
        ],
      },
      {
        title: 'Contact',
        paragraphs: [
          `Report order issues at ${CONTACT_EMAIL} or via WhatsApp support with your order number.`,
        ],
      },
    ],
  },
  shipping: {
    slug: 'shipping-policy',
    headerSubtitle: 'Shipping Policy',
    eyebrow: 'Shipping Policy',
    title: 'Medicine delivery timelines, coverage, and charges.',
    intro:
      'This policy explains how prescribed medicines are packed, shipped, and delivered after you place an order on HopeHub Care.',
    lastUpdated: 'July 2026',
    sections: [
      {
        title: 'Serviceable areas',
        paragraphs: [
          'We currently dispatch medicines to addresses within our active delivery network. Availability may vary by city, pin code, and courier partner coverage. If your area is not serviceable, our team will inform you and suggest alternatives such as clinic pickup where available.',
        ],
      },
      {
        title: 'Processing time',
        bullets: [
          'Orders are processed after prescription verification and payment confirmation.',
          'Typical packing time is 1–2 business days for in-stock items.',
          'Custom or low-stock items may need additional time; support will notify you.',
        ],
      },
      {
        title: 'Delivery timeline',
        bullets: [
          'Metro and major cities: usually 2–5 business days after dispatch.',
          'Other serviceable locations: usually 4–8 business days after dispatch.',
          'Delays may occur during holidays, weather disruptions, or remote-area routing.',
        ],
      },
      {
        title: 'Shipping charges',
        paragraphs: [
          'Delivery fees, if any, are shown at checkout before payment. Free or subsidised delivery may apply to selected order values or promotions.',
        ],
      },
      {
        title: 'Address & delivery attempts',
        bullets: [
          'Please provide a complete address with landmark and an active mobile number.',
          'Courier partners may attempt delivery more than once where possible.',
          'If delivery fails due to incorrect address or repeated unavailability, re-dispatch charges may apply.',
        ],
      },
      {
        title: 'Tracking',
        paragraphs: [
          'Where supported, tracking details or dispatch confirmation are shared by SMS, WhatsApp, or in your patient dashboard.',
        ],
      },
      {
        title: 'Contact',
        paragraphs: [`Delivery questions: ${CONTACT_EMAIL}`],
      },
    ],
  },
  payment: {
    slug: 'payment-policy',
    headerSubtitle: 'Payment Policy',
    eyebrow: 'Payment Policy',
    title: 'Consultation fees, medicine payments, refunds, and receipts.',
    intro:
      'All online payments on HopeHub Care are processed securely. This policy explains accepted methods, billing, and refunds.',
    lastUpdated: 'July 2026',
    sections: [
      {
        title: 'Accepted payment methods',
        bullets: [
          'UPI, credit/debit cards, net banking, and wallets supported by Razorpay.',
          'Payment must be completed in Indian Rupees (INR) unless otherwise stated.',
        ],
      },
      {
        title: 'Consultation payments',
        bullets: [
          'Consultation fees are displayed before you confirm booking.',
          'Payment confirms your request in the clinic queue for provider assignment and review.',
          'If a consultation cannot be provided due to clinic-side cancellation, a full refund or reschedule option will be offered.',
          'If you cancel before provider review begins, refund eligibility is assessed as per clinic rules shown at checkout.',
        ],
      },
      {
        title: 'Medicine order payments',
        bullets: [
          'Medicine totals include product cost, applicable taxes, and delivery fees shown at checkout.',
          'Orders are fulfilled after successful payment and prescription verification.',
          'If an item is unavailable after payment, we will refund the unavailable portion or offer a substitute only with your consent where appropriate.',
        ],
      },
      {
        title: 'Payment security',
        paragraphs: [
          'Card and UPI details are entered on Razorpay’s secure checkout. HopeHub does not store full payment credentials on its own servers.',
          'You are responsible for verifying the amount before authorising payment.',
        ],
      },
      {
        title: 'Refunds',
        bullets: [
          'Approved refunds are processed to the original payment method.',
          'Refund timelines depend on your bank or UPI provider — typically 5–10 business days after approval.',
          'Partial refunds may apply for partially fulfilled or partially cancelled orders.',
          'Return and exchange eligibility for physical products is described in our Return & Exchange Policy.',
        ],
      },
      {
        title: 'Invoices & receipts',
        paragraphs: [
          'Payment confirmation and invoice details are available in your patient dashboard or shared by email/SMS where enabled.',
        ],
      },
      {
        title: 'Contact',
        paragraphs: [`Billing or refund questions: ${CONTACT_EMAIL}`],
      },
    ],
  },
} satisfies Record<string, LegalPageContent>;

export type LegalPageKey = keyof typeof LEGAL_PAGES;

export const LEGAL_PAGE_KEYS = Object.keys(LEGAL_PAGES) as LegalPageKey[];

export function legalPageByKey(key: LegalPageKey): LegalPageContent {
  return LEGAL_PAGES[key];
}

export const LEGAL_PAGE_ROUTES: readonly { path: string; key: LegalPageKey }[] = [
  { path: 'privacy-policy', key: 'privacy' },
  { path: 'terms-and-conditions', key: 'terms' },
  { path: 'return-and-exchange-policy', key: 'returnExchange' },
  { path: 'shipping-policy', key: 'shipping' },
  { path: 'payment-policy', key: 'payment' },
] as const;
