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
  fullName: string;
  email: string;
  phone: string;
  city: string;
  qualification: string;
  specialization: string;
  experienceYears: string;
  registrationDetails?: string;
  languages: string;
  availability: string;
  preferredChannel: ContactMethod;
  resumeLink: string;
  portfolioLink?: string;
  whyJoin: string;
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

  sendCounsellorApplication(payload: CounsellorApplicationPayload): Observable<boolean> {
    return this.http
      .post<{ applicationId: string; success: boolean }>(
        `${environment.apiUrl}/counsellor-applications`,
        this.withBrowserContext(payload),
      )
      .pipe(map((response) => response.success));
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
