import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { IceServerConfig } from '../../shared/components/consultation-call/webrtc-call.types';

export type HopeHubBookingPayload = {
  serviceName: string;
  servicePriceInPaise?: number;
  offeringId?: string;
  offeringSlug?: string;
  paymentMode?: 'FULL' | 'PARTIAL';
  message?: string;
  appointmentDate: string;
  appointmentTime: string;
  consultantName?: string;
  consultantPhone?: string;
  sessionDuration?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  preferredContact?: string;
  urgencyLevel?: string;
  preferredTime?: string;
  preferAnonymousTelegram?: boolean;
  providerId?: string;
  careTeamServiceId?: string;
  concernCategory?: string;
  preferredExpertType?: string;
  sessionMode?: string;
  preferredLanguage?: string;
  safetyRisk?: string;
  previousTherapyOrMedication?: string;
  emergencyConsent?: boolean;
  entryPage?: string;
};

export type HopeHubOffering = {
  id: string;
  code: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
  type: string;
  priceInPaise?: number | null;
  compareAtPriceInPaise?: number | null;
  currency: string;
  discountEnabled: boolean;
  discountType: string;
  discountLabel?: string | null;
  discountCode?: string | null;
  discountPercent?: number | null;
  discountFlatInPaise?: number | null;
  discountMaxInPaise?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  isDiscountActive?: boolean;
  partialPaymentEnabled: boolean;
  partialPaymentType: string;
  partialPaymentLabel?: string | null;
  partialPaymentPercent?: number | null;
  partialPaymentFlatInPaise?: number | null;
  validityDays?: number | null;
  sessionCount?: number | null;
  sessionDurationMinutes?: number | null;
  deliveryMode: string;
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
  seatLimit?: number | null;
  venue?: string | null;
  imageUrl?: string | null;
  ctaLabel: string;
  routePath: string;
  benefits: string[];
  audience: string[];
  metadata?: {
    mediaAccessMode?: 'PUBLIC' | 'LOGIN_REQUIRED' | 'PAID_ONLY' | string;
    telegramGroupUrl?: string;
    telegramAudioUrl?: string;
    telegramVideoUrl?: string;
    recordedAudioUrl?: string;
    recordedVideoUrl?: string;
    youtubeUrl?: string;
    mediaAccessNote?: string;
    [key: string]: unknown;
  } | null;
  isFeatured: boolean;
  requiresLeadForm: boolean;
  seatsBooked?: number;
  seatsRemaining?: number | null;
  isFull?: boolean;
  sortOrder: number;
};

export type HopeHubOfferingQuote = {
  grossInPaise: number | null;
  discountInPaise: number;
  payableInPaise: number | null;
  isEligibleForDiscount: boolean;
  reason: string;
  rule?: Record<string, unknown> | null;
};

export type CareTeamServiceQuote = {
  service: {
    id: string;
    title: string;
    providerId: string;
    providerName: string;
    pricingMode: string;
    durationMinutes: number;
  };
  quote: {
    amountInPaise: number;
    payableInPaise: number;
    label: string;
    appliedRule: string;
    previousUseCount: number;
    sessionCount: number;
    requiresPayment: boolean;
    packageBalance?: {
      packageConsultationId: string;
      totalSessions: number;
      usedSessions: number;
      remainingSessions: number;
      remainingAfterThis: number;
    } | null;
  };
};

export type HopeHubOfferingAccess = {
  accessMode: string;
  canAccess: boolean;
  reason: 'PUBLIC' | 'SIGNED_IN' | 'PURCHASED' | 'LOGIN_REQUIRED' | 'PURCHASE_REQUIRED' | string;
  accessNote?: string | null;
};

export type HopeHubBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  imageUrl?: string | null;
  ctaLabel: string;
  routePath: string;
  offeringId?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
};

export type HopeHubOrganizationLeadPayload = {
  organizationName: string;
  organizationType: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  city?: string;
  audienceSize?: number | null;
  needType?: string;
  preferredDate?: string;
  notes?: string;
  offeringId?: string;
  offeringSlug?: string;
  entryPage?: string;
};

export type HopeHubProvider = {
  id: string;
  slug?: string;
  userId: string;
  name: string;
  profileImageUrl?: string | null;
  specialty?: string | null;
  designation?: string | null;
  department?: string | null;
  supportRole?:
    | 'MENTAL_WELLNESS_PROFESSIONAL'
    | 'QUALIFIED_COUNSELLOR'
    | 'PSYCHOLOGY_STUDENT_VOLUNTEER'
    | 'PEER_SUPPORT_VOLUNTEER'
    | 'NLP_COACH'
    | 'LIFE_COACH'
    | 'MEDITATION_BREATHWORK_GUIDE'
    | 'CAREER_STUDY_MENTOR'
    | 'PSYCHOLOGIST'
    | 'STUDENT_VOLUNTEER'
    | 'VOLUNTEER';
  supportRoleLabel?: string;
  careTeamType?: string;
  bio?: string | null;
  yearsOfExperience?: number | null;
  focusAreas: string[];
  qualifications?: string[];
  qualifiedFrom?: string | null;
  licenseNumber?: string | null;
  licenseCouncil?: string | null;
  languages?: string[];
  modalities?: string[];
  sessionTypes?: string[];
  ageGroups?: string[];
  concernsHandled?: string[];
  introSessionTitle?: string | null;
  counsellingApproach?: string | null;
  safetyEscalationNote?: string | null;
  acceptsHighRiskCases?: boolean;
  services?: Array<{
    id: string;
    title: string;
    description?: string | null;
    pricingMode?: 'FIXED' | 'FREE_INTRO' | 'DISCOUNTED_FIRST' | 'PACKAGE' | 'FREE_VOLUNTEER';
    priceInPaise: number;
    effectivePriceInPaise?: number;
    firstSessionPriceInPaise?: number | null;
    followUpPriceInPaise?: number | null;
    introSessionLimit?: number;
    packageSessionCount?: number | null;
    packagePriceInPaise?: number | null;
    pricingLabel?: string;
    pricingRule?: string;
    effectiveSessionCount?: number;
    currency: string;
    durationMinutes: number;
    isFree: boolean;
    sortOrder: number;
  }>;
  sessionFeeInPaise?: number;
  sessionDurationMinutes?: number;
};

export type HopeHubProviderResponse = {
  providers: HopeHubProvider[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type HopeHubService = {
  id: string;
  diseaseId: string;
  name: string;
  slug?: string | null;
  description: string;
  detailedDescription: string;
  benefits: string[];
  approach: string;
  category: string;
  featured: boolean;
  imageUrl?: string | null;
  pricing?: { individual?: number; currency: string };
  feeInPaise?: number;
  duration?: string;
  intakeQuestions?: unknown;
  publicFaq?: unknown;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type HopeHubBootstrap = {
  banners: HopeHubBanner[];
  offerings: HopeHubOffering[];
  services: HopeHubService[];
  providers: HopeHubProvider[];
  providerPagination: HopeHubProviderResponse['pagination'];
  singleSessionQuote: { offering: HopeHubOffering; quote: HopeHubOfferingQuote } | null;
};

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private bootstrapCache?: Observable<HopeHubBootstrap>;

  bootstrap(): Observable<HopeHubBootstrap> {
    if (!this.bootstrapCache) {
      this.bootstrapCache = this.http
        .get<HopeHubBootstrap>(`${this.apiUrl}/hope-hub/bootstrap`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.bootstrapCache;
  }

  createBooking(payload: HopeHubBookingPayload): Observable<{ consultation: any }> {
    return this.http.post<{ consultation: any }>(`${this.apiUrl}/hope-hub/bookings`, payload);
  }

  dashboard(): Observable<{
    consultations: any[];
    leads: any[];
    resources?: any[];
    packages?: any[];
    summary?: any;
  }> {
    return this.http.get<{
      consultations: any[];
      leads: any[];
      resources?: any[];
      packages?: any[];
      summary?: any;
    }>(`${this.apiUrl}/hope-hub/dashboard`);
  }

  requestFollowUp(entitlementId: string): Observable<{ entitlement: any }> {
    return this.http.post<{ entitlement: any }>(
      `${this.apiUrl}/hope-hub/follow-ups/${entitlementId}/request`,
      {},
    );
  }

  providers(
    params: {
      page?: number;
      pageSize?: number;
      q?: string;
      concern?: string;
      language?: string;
      modality?: string;
      sessionType?: string;
      ageGroup?: string;
    } = {},
  ): Observable<HopeHubProviderResponse> {
    const searchParams = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
      q: params.q ?? '',
    });
    if (params.concern) searchParams.set('concern', params.concern);
    if (params.language) searchParams.set('language', params.language);
    if (params.modality) searchParams.set('modality', params.modality);
    if (params.sessionType) searchParams.set('sessionType', params.sessionType);
    if (params.ageGroup) searchParams.set('ageGroup', params.ageGroup);
    return this.http.get<HopeHubProviderResponse>(
      `${this.apiUrl}/hope-hub/providers?${searchParams.toString()}`,
    );
  }

  provider(id: string): Observable<{ provider: HopeHubProvider }> {
    return this.http.get<{ provider: HopeHubProvider }>(
      `${this.apiUrl}/hope-hub/providers/${encodeURIComponent(id)}`,
    );
  }

  services(): Observable<{ services: HopeHubService[] }> {
    return this.http.get<{ services: HopeHubService[] }>(`${this.apiUrl}/hope-hub/services`);
  }

  servicesPageData(): Observable<{
    services: HopeHubService[];
    singleSessionQuote: { offering: HopeHubOffering; quote: HopeHubOfferingQuote } | null;
  }> {
    return this.bootstrap().pipe(
      map(({ services, singleSessionQuote }) => ({ services, singleSessionQuote })),
    );
  }

  service(id: string): Observable<{ service: HopeHubService }> {
    return this.http.get<{ service: HopeHubService }>(
      `${this.apiUrl}/hope-hub/services/${encodeURIComponent(id)}`,
    );
  }

  offerings(
    params: { type?: string; featured?: boolean } = {},
  ): Observable<{ offerings: HopeHubOffering[] }> {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.set('type', params.type);
    if (params.featured) searchParams.set('featured', 'true');
    const query = searchParams.toString();
    return this.http.get<{ offerings: HopeHubOffering[] }>(
      `${this.apiUrl}/hope-hub/offerings${query ? `?${query}` : ''}`,
    );
  }

  offeringsPageData(params: { types?: string[]; featured?: boolean } = {}): Observable<{
    offerings: HopeHubOffering[];
  }> {
    return this.bootstrap().pipe(
      map(({ offerings }) => ({
        offerings: offerings.filter((offering) => {
          const matchesType = !params.types?.length || params.types.includes(offering.type);
          const matchesFeatured = !params.featured || offering.isFeatured;
          return matchesType && matchesFeatured;
        }),
      })),
    );
  }

  offering(slug: string): Observable<{ offering: HopeHubOffering }> {
    return this.http.get<{ offering: HopeHubOffering }>(
      `${this.apiUrl}/hope-hub/offerings/${encodeURIComponent(slug)}`,
    );
  }

  offeringAccess(slug: string): Observable<{
    offering: HopeHubOffering;
    access: HopeHubOfferingAccess;
  }> {
    return this.http.get<{ offering: HopeHubOffering; access: HopeHubOfferingAccess }>(
      `${this.apiUrl}/hope-hub/offerings/${encodeURIComponent(slug)}/access`,
    );
  }

  offeringQuote(
    slug: string,
  ): Observable<{ offering: HopeHubOffering; quote: HopeHubOfferingQuote }> {
    return this.http.get<{ offering: HopeHubOffering; quote: HopeHubOfferingQuote }>(
      `${this.apiUrl}/hope-hub/offerings/${encodeURIComponent(slug)}/quote`,
    );
  }

  careTeamServiceQuote(id: string, providerId?: string): Observable<CareTeamServiceQuote> {
    const searchParams = new URLSearchParams();
    if (providerId) searchParams.set('providerId', providerId);
    const query = searchParams.toString();
    return this.http.get<CareTeamServiceQuote>(
      `${this.apiUrl}/hope-hub/care-team-services/${encodeURIComponent(id)}/quote${query ? `?${query}` : ''}`,
    );
  }

  banners(): Observable<{ banners: HopeHubBanner[] }> {
    return this.http.get<{ banners: HopeHubBanner[] }>(`${this.apiUrl}/hope-hub/banners`);
  }

  cachedBanners(): Observable<{ banners: HopeHubBanner[] }> {
    return this.bootstrap().pipe(map(({ banners }) => ({ banners })));
  }

  featuredProviders(): Observable<HopeHubProviderResponse> {
    return this.bootstrap().pipe(
      map(({ providers, providerPagination }) => ({
        providers,
        pagination: providerPagination,
      })),
    );
  }

  createOrganizationLead(
    payload: HopeHubOrganizationLeadPayload,
  ): Observable<{ leadId: string; success: boolean }> {
    return this.http.post<{ leadId: string; success: boolean }>(
      `${this.apiUrl}/hope-hub/organization-leads`,
      payload,
    );
  }

  iceServers(): Observable<{ iceServers: IceServerConfig[] }> {
    return this.http.get<{ iceServers: IceServerConfig[] }>(`${this.apiUrl}/rtc/ice-servers`);
  }

  slots(
    date: string,
    providerId?: string,
    careTeamServiceId?: string,
  ): Observable<{
    date: string;
    providerId?: string;
    slots: Array<{
      time: string;
      period: 'morning' | 'afternoon' | 'evening';
      available: boolean;
      booked: boolean;
    }>;
  }> {
    return this.http.get<{
      date: string;
      slots: Array<{
        time: string;
        period: 'morning' | 'afternoon' | 'evening';
        available: boolean;
        booked: boolean;
      }>;
    }>(
      `${this.apiUrl}/hope-hub/slots?date=${encodeURIComponent(date)}${
        providerId ? `&providerId=${encodeURIComponent(providerId)}` : ''
      }${careTeamServiceId ? `&careTeamServiceId=${encodeURIComponent(careTeamServiceId)}` : ''}`,
    );
  }
}
