import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_PATHS } from '../../constants/api-paths.constants';
import { AdminApiBase } from './admin-api-base';

export type ContactMailSummary = {
  id: string;
  key: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string | null;
  size: number;
  receivedAt: string | null;
  preview: string;
};

export type ContactMailDetail = ContactMailSummary & {
  text: string;
  html: string;
  rawHeaders: Record<string, string>;
};

@Injectable({ providedIn: 'root' })
export class AdminContactMailApi extends AdminApiBase {
  list(limit = 50) {
    return firstValueFrom(
      this.http.get<{ messages: ContactMailSummary[]; from: string }>(
        `${this.apiBase}${API_PATHS.ADMIN.CONTACT_MAIL}`,
        { params: { limit: String(limit) } },
      ),
    );
  }

  get(id: string) {
    return firstValueFrom(
      this.http.get<{ message: ContactMailDetail; from: string }>(
        `${this.apiBase}${API_PATHS.ADMIN.CONTACT_MAIL_BY_ID(id)}`,
      ),
    );
  }

  reply(id: string, body: string) {
    return firstValueFrom(
      this.http.post<{ message: string }>(
        `${this.apiBase}${API_PATHS.ADMIN.CONTACT_MAIL_REPLY(id)}`,
        { body },
      ),
    );
  }
}
