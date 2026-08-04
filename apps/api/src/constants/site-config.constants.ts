import { CONTACT_IDENTITY } from './config.constants.js';

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
    label: 'Telegram provider bot username',
    description: 'Doctor/provider bot username without @. E.g. Hopehubprovidersbot.'
  },
  telegramAdminBotUsername: {
    label: 'Telegram admin bot username',
    description: 'Internal admin bot username without @. Keep private in public UI.'
  },
  telegramQrCodePath: {
    label: 'Telegram QR image path',
    description: 'Public image path for Telegram QR code. E.g. /image/hopehubindiaqr.jpg.'
  },
  whatsappQrCodePath: {
    label: 'WhatsApp QR image path',
    description: 'Public image path for WhatsApp QR code. E.g. /image/whatsapp-qr.jpeg.'
  },
  telegramDefaultOfferingSlug: {
    label: 'Telegram default paid offering',
    description: 'Hope Hub offering slug used by Telegram payment links.'
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

export const SITE_CONFIG_DEFAULTS: Record<string, string> = {
  doctorListLimit: '12',
  whatsappPhone: '919876543210',
  whatsappGroupUrl: 'https://chat.whatsapp.com/CbbNoo5kXw3FWWKTGO82kz',
  whatsappGroupLabel: 'Join WhatsApp group',
  telegramUsername: 'hopehubindia',
  telegramUserBotUsername: 'Hopehubbot',
  telegramDoctorBotUsername: 'Hopehubprovidersbot',
  telegramAdminBotUsername: 'Hopehuboperationbot',
  telegramQrCodePath: '/image/hopehubindiaqr.jpg',
  whatsappQrCodePath: '/image/whatsapp-qr.jpeg',
  telegramDefaultOfferingSlug: 'single-30-minute-session',
  clinicName: 'HopeHub Care and Research Centre',
  statConsultations: '5,000+',
  statDoctors: '12+',
  statRating: '4.8★',
  statFollowUp: '92%',
  statPatientsTreated: '4,800+',
  statConditionsTreated: '15+',
  statImprovement: '92%',
  statSatisfaction: '4.8 / 5',
  contactPhone: '+91-98765-43210',
  contactPhoneTel: '+919876543210',
  contactEmail: CONTACT_IDENTITY.EMAIL,
  clinicAddressLine1: 'Ranchi Main Clinic',
  clinicAddressLine2: 'Near City Centre, Main Road',
  clinicAddressLine3: 'Ranchi, Jharkhand, India',
  clinicAddressLine4: 'Pincode — 834001',
  homeHeroEyebrow: 'Doctor-led homeopathy',
  homeHeroHeadline: 'Personalised homeopathic care for every health concern.',
  homeHeroLead:
    'Acute illnesses, chronic conditions, skin and hair issues, digestive problems, allergies, mental wellness, and more — consult qualified homeopathic doctors online with prescriptions and follow-up.'
};

export const SITE_CONFIG_KEYS = Object.keys(SITE_CONFIG_META);

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
