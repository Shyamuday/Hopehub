import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactForm, ContactMethod } from '../models/contact.model';

type LeadResponse = {
  id: string;
  success: boolean;
};

export type CounsellorApplicationPayload = {
  applicationTrack:
    'PROFESSIONAL_PSYCHOLOGIST' | 'PSYCHOLOGY_STUDENT_VOLUNTEER' | 'PEER_SUPPORT_VOLUNTEER';
  careTeamType?: string;
  fullName: string;
  email: string;
  phone: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  city: string;
  qualification: string;
  qualifiedFrom?: string;
  specialization: string;
  experienceYears: string;
  registrationDetails?: string;
  languages: string;
  availability: string;
  preferredChannel: ContactMethod;
  resumeLink: string;
  portfolioLink?: string;
  supervisionDetails?: string;
  livedExperienceSummary?: string;
  agreesToNonClinicalRole?: boolean;
  listenerScreeningAnswers?: Array<{ questionId: string; optionId: string }>;
  listenerScreeningQuestionSetId?: string;
  listenerScreeningQuestionSetVersion?: string;
  listenerGuidelinesAccepted?: boolean;
  listenerGuidelinesVersion?: string;
  listenerGuidelinesReadSessionToken?: string;
  listenerGuidelinesReadStartedAt?: string | null;
  listenerGuidelinesReadSeconds?: number;
  listenerTrainingCompleted?: boolean;
  listenerTrainingVersion?: string;
  whyJoin: string;
};

export type ListenerGuidelineReadSessionRequest = {
  applicationTrack: 'PSYCHOLOGY_STUDENT_VOLUNTEER' | 'PEER_SUPPORT_VOLUNTEER';
  email: string;
  phone: string;
  listenerGuidelinesVersion?: string;
};

export type ListenerGuidelineReadSessionResponse = {
  token: string;
  sessionId: string;
  startedAt: string;
  expiresAt: string;
  minReadSeconds: number;
  guidelinesVersion: string;
};

export type ListenerScreeningQuestion = {
  id: string;
  text: string;
  options: Array<{ id: string; text: string }>;
};

export type ListenerScreeningQuestionSetResponse = {
  questionSet: {
    id: string;
    title: string;
    version: string;
    description?: string | null;
    passScore: number;
    publishedAt?: string | null;
    updatedAt: string;
    questions: ListenerScreeningQuestion[];
  };
};

export type CounsellorApplicationResponse = {
  applicationId: string;
  success: boolean;
  autoApproved?: boolean;
  screeningScore?: number | null;
  screeningMaxScore?: number | null;
  screeningQuestionSetVersion?: string | null;
};

export type PublicTestimonial = {
  id: string;
  patientName: string;
  location?: string | null;
  condition?: string | null;
  duration?: string | null;
  quote: string;
  stars: number;
  isAnonymous: boolean;
  createdAt: string;
};

export type TestimonialFeedbackPayload = {
  displayName?: string;
  email?: string;
  location?: string;
  supportArea?: string;
  quote: string;
  stars: number;
  isAnonymous: boolean;
  consentToPublish: boolean;
};

export type FeedbackPayload = {
  feedbackType: 'IMPROVEMENT' | 'COMPLAINT' | 'BUG' | 'SERVICE_EXPERIENCE' | 'PRAISE' | 'OTHER';
  message: string;
  rating?: number;
  pageOrFeature?: string;
  name?: string;
  email?: string;
  phone?: string;
  preferredContact?: 'email' | 'phone' | 'whatsapp' | 'telegram' | 'none';
  allowFollowUp: boolean;
  isAnonymous: boolean;
  consentToPublish: boolean;
};

export type TelegramAdminApplicationPayload = {
  fullName: string;
  telegramUsername: string;
  email?: string;
  phone?: string;
  city?: string;
  availability: 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'EVENINGS' | 'FLEXIBLE';
  moderationExperience?: string;
  motivation: string;
  ageConfirmed: true;
  rulesAccepted: true;
  safetyAccepted: true;
};

@Injectable({
  providedIn: 'root',
})
export class LeadService {
  private http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/website-leads`;

  sendContactForm(formData: ContactForm): Observable<boolean> {
    return this.createLead(formData);
  }

  sendServiceInquiry(
    serviceName: string,
    userInfo: { name: string; email: string; message?: string },
  ): Observable<boolean> {
    return this.createLead({
      name: userInfo.name,
      email: userInfo.email,
      serviceInterest: serviceName,
      message: userInfo.message?.trim() || `I am interested in ${serviceName}.`,
      preferredContact: ContactMethod.EMAIL,
    });
  }

  sendCounsellorApplication(
    payload: CounsellorApplicationPayload,
  ): Observable<CounsellorApplicationResponse> {
    return this.http
      .post<CounsellorApplicationResponse>(
        `${environment.apiUrl}/counsellor-applications`,
        this.withBrowserContext(payload),
      )
      .pipe(map((response) => response));
  }

  startListenerGuidelineReadSession(
    payload: ListenerGuidelineReadSessionRequest,
  ): Observable<ListenerGuidelineReadSessionResponse> {
    return this.http.post<ListenerGuidelineReadSessionResponse>(
      `${environment.apiUrl}/counsellor-applications/listener-guidelines/read-session`,
      payload,
    );
  }

  getListenerScreeningQuestionSet(): Observable<ListenerScreeningQuestionSetResponse> {
    return this.http.get<ListenerScreeningQuestionSetResponse>(
      `${environment.apiUrl}/counsellor-applications/listener-screening`,
    );
  }

  listTestimonials(): Observable<PublicTestimonial[]> {
    return this.http
      .get<{ testimonials: PublicTestimonial[] }>(`${environment.apiUrl}/testimonials`)
      .pipe(map((response) => response.testimonials));
  }

  sendTestimonialFeedback(payload: TestimonialFeedbackPayload): Observable<boolean> {
    return this.http
      .post<{ success: boolean }>(
        `${environment.apiUrl}/testimonials`,
        this.withBrowserContext(payload),
      )
      .pipe(map((response) => response.success));
  }

  sendFeedback(payload: FeedbackPayload): Observable<boolean> {
    return this.http
      .post<{ success: boolean }>(
        `${environment.apiUrl}/website-leads/feedback`,
        this.withBrowserContext(payload),
      )
      .pipe(map((response) => response.success));
  }

  sendTelegramAdminApplication(payload: TelegramAdminApplicationPayload): Observable<boolean> {
    return this.http
      .post<{ success: boolean }>(
        `${this.endpoint}/telegram-admin-applications`,
        this.withBrowserContext(payload),
      )
      .pipe(map((response) => response.success));
  }

  private createLead(payload: ContactForm): Observable<boolean> {
    return this.http
      .post<LeadResponse>(this.endpoint, this.withBrowserContext(payload))
      .pipe(map((response) => response.success));
  }

  private withBrowserContext<T extends object>(payload: T) {
    return {
      ...payload,
      entryPage: typeof window === 'undefined' ? undefined : window.location.href,
    };
  }
}
