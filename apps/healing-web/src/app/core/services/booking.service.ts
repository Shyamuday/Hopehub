import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { IceServerConfig } from '@hopehub/platform-ui';

export type HopeHubBookingPayload = {
  serviceName: string;
  servicePriceInPaise?: number;
  offeringId?: string;
  offeringSlug?: string;
  paymentMode?: 'FULL' | 'PARTIAL';
  promoCode?: string;
  walletRedeemInPaise?: number;
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
  preferredProviderGender?: string;
  safetyRisk?: string;
  previousTherapyOrMedication?: string;
  emergencyConsent?: boolean;
  listenerSupportConsent?: boolean;
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

export type HopeHubCheckoutQuote = {
  grossAmountInPaise: number;
  discountInPaise: number;
  walletRedeemedInPaise: number;
  payableInPaise: number;
  walletBalanceInPaise: number;
  maxWalletRedeemInPaise: number;
  appliedRules: Array<{
    ruleId: string;
    code: string;
    name: string;
    amountInPaise: number;
    valueType: string;
  }>;
};

export type CareTeamServiceQuote = {
  service: {
    id: string;
    providerRole?: string | null;
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

export type HopeHubSlotDayStatus = 'AVAILABLE' | 'FULL' | 'NO_SLOTS' | 'CAPACITY_FULL' | 'CLOSED';

export type HopeHubSlotDay = {
  date: string;
  providerId?: string;
  dayStatus?: HopeHubSlotDayStatus;
  dayStatusLabel?: string;
  emptyMessage?: string;
  capacityMessage?: string;
  slots: Array<{
    time: string;
    period: 'morning' | 'afternoon' | 'evening';
    available: boolean;
    booked: boolean;
  }>;
};

export function isBackendCareTeamServiceId(id?: string | null): id is string {
  const value = String(id || '').trim();
  if (!value) return false;
  return !/^(listener|provider|quick|support|default)-/i.test(value);
}

export type ConsultationCallSession = {
  id: string;
  consultationId: string;
  initiatedByUserId: string;
  targetUserId: string;
  mode: string;
  status: string;
  startedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  endReason?: string | null;
  lastSignalEvent?: string | null;
  metadata?: {
    usedTurnRelay?: boolean;
    localCandidateType?: string;
    remoteCandidateType?: string;
    transportProtocol?: string;
    networkType?: string;
    currentRoundTripTime?: number;
    bytesSent?: number;
    bytesReceived?: number;
    [key: string]: unknown;
  } | null;
};

export type HopeHubLiveGroup = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  callTitle?: string | null;
  callAgenda?: string | null;
  pinnedMessage?: string | null;
  roomRules?: string | null;
  status: 'LIVE' | 'SCHEDULED' | string;
  mode: 'CHAT' | 'VOICE' | 'VIDEO' | string;
  slowModeSeconds?: number;
  hostUserId?: string | null;
  isPublic: boolean;
  startsAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: HopeHubLiveGroupMessage | null;
};

export type HopeHubLiveGroupMessage = {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole?: string | null;
  body: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedByUserId?: string | null;
  createdAt: string;
};

export type HopeHubLiveGroupModeration = {
  isMuted: boolean;
  mutedUntil?: string | null;
  isBanned: boolean;
  removedAt?: string | null;
  reason?: string | null;
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
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
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
  supportTierLabel?: string;
  supportTierTone?: string;
  supportRoleDescription?: string;
  supportScope?: string;
  supportBestFor?: string[];
  supportNotFor?: string[];
  bookingCtaLabel?: string;
  isClinicalCare?: boolean;
  isScreenedListener?: boolean;
  listenerTrustLabel?: string | null;
  listenerTrustNote?: string | null;
  careTeamType?: string;
  careTeamTypes?: string[];
  providerClassification?: ProviderClassification;
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
  autoMatchEnabled?: boolean;
  acceptingNewUsers?: boolean;
  maxSessionsPerDay?: number | null;
  maxSessionsPerWeek?: number | null;
  services?: Array<{
    id: string;
    providerRole?: string | null;
    title: string;
    description?: string | null;
    pricingMode?:
      'FIXED' | 'FREE_INTRO' | 'DISCOUNTED_FIRST' | 'PACKAGE' | 'FREE_VOLUNTEER' | 'PER_MINUTE';
    priceInPaise: number;
    effectivePriceInPaise?: number;
    firstSessionPriceInPaise?: number | null;
    followUpPriceInPaise?: number | null;
    introSessionLimit?: number;
    packageSessionCount?: number | null;
    packagePriceInPaise?: number | null;
    freeMinutes?: number;
    pricePerMinuteInPaise?: number | null;
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
  quickTalkAvailable?: boolean;
  liveStatus?: string;
  acceptsChat?: boolean;
  acceptsVoiceCall?: boolean;
  acceptsVideoCall?: boolean;
  liveConnectMode?: 'chat' | 'voice' | 'video' | string;
  wentLiveAt?: string | null;
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
    return this.http.post<{ consultation: any }>(`${this.apiUrl}/hope-hub/bookings`, {
      ...payload,
      careTeamServiceId: isBackendCareTeamServiceId(payload.careTeamServiceId)
        ? payload.careTeamServiceId
        : undefined,
    });
  }

  createQuickTalk(payload: {
    providerId?: string;
    careTeamServiceId?: string;
    message?: string;
    concernCategory?: string;
    preferredExpertType?: string;
    sessionMode?: string;
    preferredLanguage?: string;
    preferredProviderGender?: string;
    safetyRisk?: string;
    previousTherapyOrMedication?: string;
    emergencyConsent?: boolean;
    listenerSupportConsent?: boolean;
    walletRedeemInPaise?: number;
    promoCode?: string;
    entryPage?: string;
  }): Observable<{ consultation: any; provider: { id: string; userId: string; name: string } }> {
    return this.http.post<{
      consultation: any;
      provider: { id: string; userId: string; name: string };
    }>(`${this.apiUrl}/hope-hub/quick-talk`, {
      ...payload,
      careTeamServiceId: isBackendCareTeamServiceId(payload.careTeamServiceId)
        ? payload.careTeamServiceId
        : undefined,
    });
  }

  checkoutQuote(payload: {
    grossInPaise: number;
    promoCode?: string;
    walletRedeemInPaise?: number;
    serviceName?: string;
    offeringId?: string;
    careTeamServiceId?: string;
    providerId?: string;
    assessmentId?: string;
  }): Observable<{ quote: HopeHubCheckoutQuote }> {
    return this.http.post<{ quote: HopeHubCheckoutQuote }>(
      `${this.apiUrl}/hope-hub/checkout-quote`,
      {
        ...payload,
        careTeamServiceId: isBackendCareTeamServiceId(payload.careTeamServiceId)
          ? payload.careTeamServiceId
          : undefined,
      },
    );
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

  consultation(consultationId: string): Observable<{ consultation: any }> {
    return this.http.get<{ consultation: any }>(
      `${this.apiUrl}/consultations/${encodeURIComponent(consultationId)}`,
    );
  }

  submitConsultationFeedback(
    consultationId: string,
    payload: { rating: number; helpful?: boolean; followUpNeeded?: boolean; message?: string },
  ): Observable<{ feedback: unknown }> {
    return this.http.post<{ feedback: unknown }>(
      `${this.apiUrl}/consultations/${encodeURIComponent(consultationId)}/feedback`,
      payload,
    );
  }

  sendConsultationMessage(consultationId: string, body: string): Observable<{ message: any }> {
    return this.http.post<{ message: any }>(
      `${this.apiUrl}/consultations/${encodeURIComponent(consultationId)}/messages`,
      { body },
    );
  }

  consultationCallSessions(
    consultationId: string,
  ): Observable<{ callSessions: ConsultationCallSession[] }> {
    return this.http.get<{ callSessions: ConsultationCallSession[] }>(
      `${this.apiUrl}/consultations/${encodeURIComponent(consultationId)}/call-sessions`,
    );
  }

  liveGroups(): Observable<{ groups: HopeHubLiveGroup[] }> {
    return this.http.get<{ groups: HopeHubLiveGroup[] }>(`${this.apiUrl}/hope-hub/live-groups`);
  }

  createLiveGroup(payload: {
    title: string;
    slug?: string;
    description?: string;
    callTitle?: string;
    callAgenda?: string;
    mode?: 'CHAT' | 'VOICE' | 'VIDEO';
    status?: 'LIVE' | 'SCHEDULED';
  }): Observable<{ group: HopeHubLiveGroup }> {
    return this.http.post<{ group: HopeHubLiveGroup }>(
      `${this.apiUrl}/hope-hub/live-groups`,
      payload,
    );
  }

  updateLiveGroupDetails(
    groupId: string,
    payload: {
      title?: string;
      description?: string;
      callTitle?: string;
      callAgenda?: string;
      pinnedMessage?: string;
      roomRules?: string;
      slowModeSeconds?: number;
    },
  ): Observable<{ group: HopeHubLiveGroup }> {
    return this.http.patch<{ group: HopeHubLiveGroup }>(
      `${this.apiUrl}/hope-hub/live-groups/${encodeURIComponent(groupId)}/details`,
      payload,
    );
  }

  updateLiveGroupMode(
    groupId: string,
    mode: 'CHAT' | 'VOICE' | 'VIDEO',
  ): Observable<{ group: HopeHubLiveGroup }> {
    return this.http.patch<{ group: HopeHubLiveGroup }>(
      `${this.apiUrl}/hope-hub/live-groups/${encodeURIComponent(groupId)}/mode`,
      { mode },
    );
  }

  liveGroup(groupId: string): Observable<{
    group: HopeHubLiveGroup;
    messages: HopeHubLiveGroupMessage[];
    requiresLoginToSpeak?: boolean;
    moderation?: HopeHubLiveGroupModeration;
  }> {
    return this.http.get<{
      group: HopeHubLiveGroup;
      messages: HopeHubLiveGroupMessage[];
      requiresLoginToSpeak?: boolean;
      moderation?: HopeHubLiveGroupModeration;
    }>(`${this.apiUrl}/hope-hub/live-groups/${encodeURIComponent(groupId)}`);
  }

  liveGroupCallToken(groupId: string): Observable<{
    url: string;
    token: string;
    roomName: string;
    mode: 'VOICE' | 'VIDEO' | string;
    canPublish: boolean;
    moderation?: HopeHubLiveGroupModeration;
    group: HopeHubLiveGroup;
  }> {
    return this.http.post<{
      url: string;
      token: string;
      roomName: string;
      mode: 'VOICE' | 'VIDEO' | string;
      canPublish: boolean;
      moderation?: HopeHubLiveGroupModeration;
      group: HopeHubLiveGroup;
    }>(`${this.apiUrl}/hope-hub/live-groups/${encodeURIComponent(groupId)}/call-token`, {});
  }

  moderateLiveGroupMember(
    groupId: string,
    payload: {
      userId: string;
      displayName?: string;
      role?: string;
      action: 'MUTE' | 'UNMUTE' | 'BAN' | 'UNBAN' | 'REMOVE';
      mutedMinutes?: number;
      reason?: string;
    },
  ): Observable<{ moderation: HopeHubLiveGroupModeration }> {
    return this.http.post<{ moderation: HopeHubLiveGroupModeration }>(
      `${this.apiUrl}/hope-hub/live-groups/${encodeURIComponent(groupId)}/moderation`,
      payload,
    );
  }

  removeLiveGroupMessage(
    groupId: string,
    messageId: string,
  ): Observable<{ message: HopeHubLiveGroupMessage }> {
    return this.http.delete<{ message: HopeHubLiveGroupMessage }>(
      `${this.apiUrl}/hope-hub/live-groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
    );
  }

  sendLiveGroupMessage(
    groupId: string,
    body: string,
  ): Observable<{ message: HopeHubLiveGroupMessage }> {
    return this.http.post<{ message: HopeHubLiveGroupMessage }>(
      `${this.apiUrl}/hope-hub/live-groups/${encodeURIComponent(groupId)}/messages`,
      { body },
    );
  }

  reportLiveGroupMessage(
    groupId: string,
    payload: {
      messageId?: string;
      targetUserId?: string;
      targetDisplayName?: string;
      reason: string;
      details?: string;
    },
  ): Observable<{ report: { id: string; status: string; createdAt: string } }> {
    return this.http.post<{ report: { id: string; status: string; createdAt: string } }>(
      `${this.apiUrl}/hope-hub/live-groups/${encodeURIComponent(groupId)}/reports`,
      payload,
    );
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
      roleGroup?: string;
      concern?: string;
      language?: string;
      modality?: string;
      sessionType?: string;
      ageGroup?: string;
      gender?: string;
      autoMatchOnly?: boolean;
    } = {},
  ): Observable<HopeHubProviderResponse> {
    const searchParams = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
      q: params.q ?? '',
    });
    if (params.roleGroup) searchParams.set('roleGroup', params.roleGroup);
    if (params.concern) searchParams.set('concern', params.concern);
    if (params.language) searchParams.set('language', params.language);
    if (params.modality) searchParams.set('modality', params.modality);
    if (params.sessionType) searchParams.set('sessionType', params.sessionType);
    if (params.ageGroup) searchParams.set('ageGroup', params.ageGroup);
    if (params.gender) searchParams.set('gender', params.gender);
    if (params.autoMatchOnly) searchParams.set('autoMatchOnly', 'true');
    return this.http.get<HopeHubProviderResponse>(
      `${this.apiUrl}/hope-hub/providers?${searchParams.toString()}`,
    );
  }

  quickTalkProviders(
    params: {
      q?: string;
      roleGroup?: string;
      concern?: string;
      language?: string;
      modality?: string;
      sessionType?: string;
      ageGroup?: string;
      gender?: string;
      mode?: 'chat' | 'voice' | 'video' | string;
    } = {},
  ): Observable<{
    providers: HopeHubProvider[];
    total: number;
  }> {
    const searchParams = new URLSearchParams({ q: params.q ?? '' });
    if (params.roleGroup) searchParams.set('roleGroup', params.roleGroup);
    if (params.concern) searchParams.set('concern', params.concern);
    if (params.language) searchParams.set('language', params.language);
    if (params.modality) searchParams.set('modality', params.modality);
    if (params.sessionType) searchParams.set('sessionType', params.sessionType);
    if (params.ageGroup) searchParams.set('ageGroup', params.ageGroup);
    if (params.gender) searchParams.set('gender', params.gender);
    if (params.mode) searchParams.set('mode', params.mode);
    return this.http.get<{
      providers: HopeHubProvider[];
      total: number;
    }>(`${this.apiUrl}/hope-hub/quick-talk/providers?${searchParams.toString()}`);
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

  slots(date: string, providerId?: string, careTeamServiceId?: string): Observable<HopeHubSlotDay> {
    const backendCareTeamServiceId = isBackendCareTeamServiceId(careTeamServiceId)
      ? careTeamServiceId
      : '';
    return this.http.get<HopeHubSlotDay>(
      `${this.apiUrl}/hope-hub/slots?date=${encodeURIComponent(date)}${
        providerId ? `&providerId=${encodeURIComponent(providerId)}` : ''
      }${
        backendCareTeamServiceId
          ? `&careTeamServiceId=${encodeURIComponent(backendCareTeamServiceId)}`
          : ''
      }`,
    );
  }
}
import type { ProviderClassification } from '@hopehub/contracts';
