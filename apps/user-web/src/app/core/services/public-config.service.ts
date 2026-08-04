import { Injectable, inject } from '@angular/core';
import { ClinicApiClient } from '../../clinic-api/clinic-api.client';
import { API_PATHS } from '../constants/api-paths.constants';

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

const EMPTY_PUBLIC_CONFIG: PublicConfig = {
  whatsappPhone: '',
  clinicName: '',
  contactPhone: '',
  contactPhoneTel: '',
  contactEmail: '',
  clinicAddressLine1: '',
  clinicAddressLine2: '',
  clinicAddressLine3: '',
  clinicAddressLine4: '',
  homeHeroEyebrow: '',
  homeHeroHeadline: '',
  homeHeroLead: '',
  statConsultations: '',
  statDoctors: '',
  statRating: '',
  statFollowUp: '',
  statPatientsTreated: '',
  statConditionsTreated: '',
  statImprovement: '',
  statSatisfaction: '',
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
          this.cached = r.config;
          return this.cached;
        })
        .catch(() => EMPTY_PUBLIC_CONFIG);
    }
    return this.loading!;
  }

  whatsappUrl(config: PublicConfig): string {
    const phone = config.whatsappPhone;
    if (!phone) return '';
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
      clinicName: config.clinicName,
      lines,
      phoneLabel: 'Phone',
      phone: config.contactPhone,
      phoneHref: config.contactPhoneTel ? `tel:${config.contactPhoneTel}` : '',
      email: config.contactEmail,
      emailHref: config.contactEmail ? `mailto:${config.contactEmail}` : '',
    };
  }
}
