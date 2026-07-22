import { Injectable, inject } from '@angular/core';
import { ClinicApiClient } from '../../clinic-api/clinic-api.client';
import { API_PATHS } from '../constants/api-paths.constants';
import { FOOTER_CONTENT } from '../constants/footer-content.constants';

export type PublicConfig = {
  whatsappPhone: string;
  clinicName: string;
  contactPhone: string;
  contactPhoneTel: string;
  contactEmail: string;
  clinicAddressLine1: string;
  clinicAddressLine2: string;
  clinicAddressLine3: string;
  clinicAddressLine4: string;
  homeHeroEyebrow: string;
  homeHeroHeadline: string;
  homeHeroLead: string;
  statConsultations: string;
  statDoctors: string;
  statRating: string;
  statFollowUp: string;
  statPatientsTreated: string;
  statConditionsTreated: string;
  statImprovement: string;
  statSatisfaction: string;
};

export type PublicFooterContact = {
  clinicName: string;
  lines: string[];
  phoneLabel: string;
  phone: string;
  phoneHref: string;
  email: string;
  emailHref: string;
};

const FALLBACK: PublicConfig = {
  whatsappPhone: '919876543210',
  clinicName: FOOTER_CONTENT.address.clinicName,
  contactPhone: FOOTER_CONTENT.address.phone,
  contactPhoneTel: FOOTER_CONTENT.address.phoneHref.replace('tel:', ''),
  contactEmail: FOOTER_CONTENT.address.email,
  clinicAddressLine1: FOOTER_CONTENT.address.lines[0] ?? '',
  clinicAddressLine2: FOOTER_CONTENT.address.lines[1] ?? '',
  clinicAddressLine3: FOOTER_CONTENT.address.lines[2] ?? '',
  clinicAddressLine4: FOOTER_CONTENT.address.lines[3] ?? '',
  homeHeroEyebrow: 'provider-led healthcare',
  homeHeroHeadline: 'Personalised care for every health concern.',
  homeHeroLead:
    'Acute illnesses, chronic conditions, skin and hair issues, digestive problems, allergies, mental wellness, nutrition, rehabilitation, and more - consult qualified healthcare providers online with guidance, prescriptions where appropriate, and follow-up.',
  statConsultations: '5,000+',
  statDoctors: '12+',
  statRating: '4.8★',
  statFollowUp: '92%',
  statPatientsTreated: '4,800+',
  statConditionsTreated: '15+',
  statImprovement: '92%',
  statSatisfaction: '4.8 / 5',
};

@Injectable({ providedIn: 'root' })
export class PublicConfigService {
  private readonly client = inject(ClinicApiClient);
  private cached: PublicConfig | null = null;
  private loading: Promise<PublicConfig> | null = null;

  async get(): Promise<PublicConfig> {
    if (this.cached) return this.cached;
    if (!this.loading) {
      this.loading = this.client
        .get<{ config: PublicConfig }>(API_PATHS.PUBLIC_CONFIG)
        .then((r: { config: PublicConfig }) => {
          this.cached = { ...FALLBACK, ...r.config };
          return this.cached;
        })
        .catch(() => FALLBACK as PublicConfig);
    }
    return this.loading!;
  }

  whatsappUrl(config: PublicConfig): string {
    const phone = config.whatsappPhone || FALLBACK.whatsappPhone;
    return `https://wa.me/${phone}?text=Hi%20HopeHub%20Care%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.`;
  }

  footerContact(config: PublicConfig): PublicFooterContact {
    const lines = [
      config.clinicAddressLine1,
      config.clinicAddressLine2,
      config.clinicAddressLine3,
      config.clinicAddressLine4,
    ].filter((line) => line?.trim());

    return {
      clinicName: config.clinicName || FALLBACK.clinicName,
      lines,
      phoneLabel: FOOTER_CONTENT.address.phoneLabel,
      phone: config.contactPhone || FALLBACK.contactPhone,
      phoneHref: `tel:${config.contactPhoneTel || FALLBACK.contactPhoneTel}`,
      email: config.contactEmail || FALLBACK.contactEmail,
      emailHref: `mailto:${config.contactEmail || FALLBACK.contactEmail}`,
    };
  }
}
