import { PUBLIC_IMAGE_ASSETS } from './public-assets.constants.js';

export const SITE_CONFIG_META: Record<string, { label: string; description: string }> = {
  doctorListLimit: {
    label: 'Doctor list limit',
    description: 'Maximum number of doctors shown on the public Our Doctors page (1–50).'
  },
  whatsappPhone: {
    label: 'WhatsApp phone number',
    description: 'Phone number (with country code, no +) used for WhatsApp CTAs. E.g. 919876543210.'
  },
  whatsappGroupUrl: {
    label: 'WhatsApp group link',
    description:
      'Public WhatsApp group/community invite link used on Healing Hub and Telegram bots.'
  },
  whatsappGroupLabel: {
    label: 'WhatsApp button label',
    description: 'Button label shown for WhatsApp group links.'
  },
  telegramUsername: {
    label: 'Telegram public username',
    description: 'Public Telegram community username without @. E.g. hopehubindia.'
  },
  telegramUserBotUsername: {
    label: 'Telegram user bot username',
    description: 'User/support bot username without @. E.g. Hopehubbot.'
  },
  telegramDoctorBotUsername: {
    label: 'Telegram care team bot username',
    description: 'Care team/doctor bot username without @. E.g. Hopehubprovidersbot.'
  },
  telegramAdminBotUsername: {
    label: 'Telegram admin bot username',
    description: 'Internal admin bot username without @. Keep private in public UI.'
  },
  telegramQrCodePath: {
    label: 'Telegram QR image path',
    description:
      'Public image URL for Telegram QR code. E.g. https://cdn.hopehub.in/qr/telegram/hopehubindiaqr.jpg.'
  },
  whatsappQrCodePath: {
    label: 'WhatsApp QR image path',
    description:
      'Public image URL for WhatsApp QR code. E.g. https://cdn.hopehub.in/qr/whatsapp/whatsapp-qr.jpeg.'
  },
  telegramDefaultOfferingSlug: {
    label: 'Telegram default paid offering',
    description: 'Hope Hub offering slug used by Telegram payment links.'
  },
  hopeHubDefaultServiceName: {
    label: 'Hope Hub default service name',
    description:
      'Fallback service name used when a user books directly without selecting a specific service.'
  },
  hopeHubDefaultSessionPriceInPaise: {
    label: 'Hope Hub default session price',
    description: 'Fallback direct booking session price in paise. E.g. 50000 for ₹500.'
  },
  hopeHubDefaultSessionDurationMinutes: {
    label: 'Hope Hub default session duration',
    description: 'Fallback direct booking session duration in minutes. E.g. 30.'
  },
  hopeHubDefaultSessionLabel: {
    label: 'Hope Hub default session label',
    description: 'Human-readable session duration label. E.g. "30 min + 15 min follow-up".'
  },
  hopeHubDefaultCareRoleLabel: {
    label: 'Hope Hub default care role label',
    description: 'Fallback public role label for care team members without a custom role label.'
  },
  clinicName: {
    label: 'Clinic name',
    description: 'Public clinic name shown in header, emails, and meta tags.'
  },
  statConsultations: {
    label: 'Stat: consultations completed',
    description: 'Public headline stat shown on the homepage. E.g. "5,000+".'
  },
  statDoctors: {
    label: 'Stat: number of doctors',
    description: 'Public headline stat for doctor count. E.g. "12+".'
  },
  statRating: {
    label: 'Stat: patient rating',
    description: 'Public satisfaction rating. E.g. "4.8★".'
  },
  statFollowUp: {
    label: 'Stat: follow-up compliance',
    description: 'Public follow-up stat. E.g. "92%".'
  },
  statPatientsTreated: {
    label: 'Testimonials: patients treated',
    description: 'Shown on the testimonials page. E.g. "4,800+".'
  },
  statConditionsTreated: {
    label: 'Testimonials: conditions treated',
    description: 'Shown on the testimonials page. E.g. "15+".'
  },
  statImprovement: {
    label: 'Testimonials: improvement rate',
    description: 'Shown on the testimonials page. E.g. "92%".'
  },
  statSatisfaction: {
    label: 'Testimonials: satisfaction score',
    description: 'Shown on the testimonials page. E.g. "4.8 / 5".'
  },
  contactPhone: {
    label: 'Contact phone (display)',
    description: 'Phone shown in the site footer. E.g. +91-98765-43210.'
  },
  contactPhoneTel: {
    label: 'Contact phone (tel link)',
    description: 'Digits for tel: links. E.g. +919876543210.'
  },
  contactEmail: {
    label: 'Contact email',
    description: 'Support email shown in the footer.'
  },
  clinicAddressLine1: {
    label: 'Address line 1',
    description: 'First line of clinic address in the footer.'
  },
  clinicAddressLine2: {
    label: 'Address line 2',
    description: 'Second address line.'
  },
  clinicAddressLine3: {
    label: 'Address line 3',
    description: 'Third address line (city/state).'
  },
  clinicAddressLine4: {
    label: 'Address line 4',
    description: 'Fourth address line (pincode/country).'
  },
  homeHeroEyebrow: {
    label: 'Home hero eyebrow',
    description: 'Small label above the homepage headline.'
  },
  homeHeroHeadline: {
    label: 'Home hero headline',
    description: 'Main headline on the homepage booking section.'
  },
  homeHeroLead: {
    label: 'Home hero lead text',
    description: 'Supporting paragraph under the homepage headline.'
  }
};

export const SITE_CONFIG_KEYS = Object.keys(SITE_CONFIG_META);

export const SITE_CONFIG_DEFAULTS: Record<string, string> = {
  telegramQrCodePath: PUBLIC_IMAGE_ASSETS.QR.TELEGRAM,
  whatsappQrCodePath: PUBLIC_IMAGE_ASSETS.QR.WHATSAPP,
  hopeHubDefaultServiceName: 'Mental wellness session',
  hopeHubDefaultSessionPriceInPaise: '50000',
  hopeHubDefaultSessionDurationMinutes: '30',
  hopeHubDefaultSessionLabel: '30 min + 15 min follow-up',
  hopeHubDefaultCareRoleLabel: 'Hope Hub care guide'
};

export const PUBLIC_SITE_CONFIG_KEYS = [
  'whatsappPhone',
  'whatsappGroupUrl',
  'whatsappGroupLabel',
  'telegramUsername',
  'telegramUserBotUsername',
  'telegramDoctorBotUsername',
  'telegramQrCodePath',
  'whatsappQrCodePath',
  'telegramDefaultOfferingSlug',
  'hopeHubDefaultServiceName',
  'hopeHubDefaultSessionPriceInPaise',
  'hopeHubDefaultSessionDurationMinutes',
  'hopeHubDefaultSessionLabel',
  'hopeHubDefaultCareRoleLabel',
  'clinicName',
  'contactPhone',
  'contactPhoneTel',
  'contactEmail',
  'clinicAddressLine1',
  'clinicAddressLine2',
  'clinicAddressLine3',
  'clinicAddressLine4',
  'homeHeroEyebrow',
  'homeHeroHeadline',
  'homeHeroLead',
  'statConsultations',
  'statDoctors',
  'statRating',
  'statFollowUp',
  'statPatientsTreated',
  'statConditionsTreated',
  'statImprovement',
  'statSatisfaction'
] as const;

export const REQUIRED_PUBLIC_SITE_CONFIG_KEYS = [
  'whatsappGroupUrl',
  'telegramUsername',
  'telegramUserBotUsername',
  'telegramDoctorBotUsername',
  'telegramQrCodePath',
  'whatsappQrCodePath',
  'telegramDefaultOfferingSlug'
] as const;
