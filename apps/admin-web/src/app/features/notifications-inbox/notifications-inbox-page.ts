import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NotificationInboxComponent } from '@hopehub/platform-ui';
import { CROSS_APP_API_PATHS } from '@hopehub/clinic-api/cross-app-api-paths.constants';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { ADMIN_CONTACT } from '../../core/constants/contact.constants';
import {
  AdminContactMailApi,
  type ContactMailDetail,
  type ContactMailSummary,
} from '../../core/services/admin/admin-contact-mail.api';

@Component({
  selector: 'app-notifications-inbox-page',
  standalone: true,
  imports: [DatePipe, NotificationInboxComponent],
  templateUrl: './notifications-inbox-page.html',
  styleUrl: './notifications-inbox-page.scss',
})
export class NotificationsInboxPage implements OnInit {
  private readonly mailApi = inject(AdminContactMailApi);

  readonly defaultReplyFrom = ADMIN_CONTACT.replyFrom;
  readonly tab = signal<'notifications' | 'email'>('notifications');
  readonly messages = signal<ContactMailSummary[]>([]);
  readonly selected = signal<ContactMailDetail | null>(null);
  readonly replyFrom = signal('');
  readonly replyBody = signal('');
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly sendingReply = signal(false);
  readonly error = signal('');
  readonly toast = signal('');

  readonly selectedId = computed(() => this.selected()?.id || '');
  readonly replyDisabled = computed(
    () => this.sendingReply() || !this.selected()?.fromEmail || !this.replyBody().trim(),
  );

  readonly inboxConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: CROSS_APP_API_PATHS.NOTIFICATIONS,
  };

  ngOnInit() {
    void this.loadMail();
  }

  async loadMail() {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.mailApi.list();
      this.messages.set(response.messages || []);
      this.replyFrom.set(response.from || '');
      if (!this.selected() && response.messages?.length) {
        await this.openMail(response.messages[0]);
      }
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load contact email.');
    } finally {
      this.loading.set(false);
    }
  }

  async openMail(message: ContactMailSummary) {
    this.detailLoading.set(true);
    this.error.set('');
    this.replyBody.set('');
    try {
      const response = await this.mailApi.get(message.id);
      this.selected.set(response.message);
      this.replyFrom.set(response.from || this.replyFrom());
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not open email.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  async sendReply() {
    const message = this.selected();
    if (!message || this.replyDisabled()) return;
    this.sendingReply.set(true);
    this.error.set('');
    try {
      const response = await this.mailApi.reply(message.id, this.replyBody().trim());
      this.replyBody.set('');
      this.showToast(response.message || 'Reply sent.');
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not send reply.');
    } finally {
      this.sendingReply.set(false);
    }
  }

  inputValue(event: Event) {
    return (event.target as HTMLTextAreaElement).value;
  }

  plainHtmlFallback() {
    const html = this.selected()?.html || '';
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private showToast(message: string) {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
