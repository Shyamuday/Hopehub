import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactForm, ContactMethod } from '../models/contact.model';

type LeadResponse = {
  id: string;
  success: boolean;
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

  private createLead(payload: ContactForm): Observable<boolean> {
    return this.http
      .post<LeadResponse>(this.endpoint, this.withBrowserContext(payload))
      .pipe(map((response) => response.success));
  }

  private withBrowserContext(payload: ContactForm) {
    return {
      ...payload,
      entryPage: typeof window === 'undefined' ? undefined : window.location.href,
    };
  }
}
