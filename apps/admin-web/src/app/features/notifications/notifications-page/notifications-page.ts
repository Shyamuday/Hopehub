import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { PLATFORM_BROADCAST_ROLES } from '../../../core/constants/platform-roles.constants';

function emptyTemplateForm() {
  return { code: '', name: '', title: '', body: '', channel: 'IN_APP', isActive: true };
}

function emptyBroadcastForm() {
  return {
    title: '',
    body: '',
    channel: 'IN_APP',
    audience: 'ALL_PATIENTS',
    audienceRole: 'PATIENT',
    templateId: '',
  };
}

@Component({
  selector: 'app-notifications-page',
  imports: [FormField, DatePipe],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
})
export class NotificationsPage implements OnInit {
  private api = inject(AdminApi);

  templates = signal<any[]>([]);
  broadcasts = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  tab = signal<'templates' | 'broadcast'>('templates');
  modal = signal<'create' | 'edit' | 'send' | null>(null);
  selected = signal<any>(null);
  error = signal('');
  toast = signal('');

  readonly templateModel = signal(emptyTemplateForm());
  readonly templateForm = form(this.templateModel);
  readonly broadcastModel = signal(emptyBroadcastForm());
  readonly broadcastForm = form(this.broadcastModel);

  readonly channels = ['IN_APP', 'SMS', 'WHATSAPP', 'EMAIL', 'PUSH'];
  readonly audiences = [
    { value: 'ALL_PATIENTS', label: 'All patients' },
    { value: 'ALL_DOCTORS', label: 'All providers' },
    { value: 'ROLE', label: 'Specific role' },
  ];
  readonly roles = [...PLATFORM_BROADCAST_ROLES];

  ngOnInit(): void {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const [templatesRes, broadcastsRes] = await Promise.all([
        this.api.getNotificationTemplates(),
        this.api.getNotificationBroadcasts(),
      ]);
      this.templates.set(templatesRes.templates);
      this.broadcasts.set(broadcastsRes.broadcasts);
    } catch {
      this.error.set('Could not load notifications.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreateTemplate() {
    this.templateModel.set(emptyTemplateForm());
    this.error.set('');
    this.modal.set('create');
  }

  openEditTemplate(template: any) {
    this.selected.set(template);
    this.templateModel.set({
      code: template.code,
      name: template.name,
      title: template.title,
      body: template.body,
      channel: template.channel,
      isActive: template.isActive !== false,
    });
    this.error.set('');
    this.modal.set('edit');
  }

  openSendBroadcast(template?: any) {
    this.broadcastModel.set({
      title: template?.title ?? '',
      body: template?.body ?? '',
      channel: template?.channel ?? 'IN_APP',
      audience: 'ALL_PATIENTS',
      audienceRole: 'PATIENT',
      templateId: template?.id ?? '',
    });
    this.error.set('');
    this.modal.set('send');
  }

  closeModal() {
    this.modal.set(null);
  }

  async saveTemplate() {
    const form = this.templateModel();
    if (!form.name || !form.title || !form.body) {
      this.error.set('Name, title, and body are required.');
      return;
    }
    this.saving.set(true);
    try {
      if (this.modal() === 'create') {
        if (!form.code) {
          this.error.set('Code is required.');
          return;
        }
        await this.api.createNotificationTemplate(form);
        this.showToast('Template created.');
      } else {
        await this.api.updateNotificationTemplate(this.selected()!.id, {
          name: form.name,
          title: form.title,
          body: form.body,
          channel: form.channel,
          isActive: form.isActive,
        });
        this.showToast('Template updated.');
      }
      this.modal.set(null);
      await this.load();
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }

  async sendBroadcast() {
    const form = this.broadcastModel();
    if (!form.title || !form.body) {
      this.error.set('Title and body are required.');
      return;
    }
    this.saving.set(true);
    try {
      const result = await this.api.sendNotificationBroadcast({
        ...form,
        templateId: form.templateId || undefined,
      });
      this.showToast(`Sent to ${result.recipientCount} recipients.`);
      this.modal.set(null);
      await this.load();
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Broadcast failed.');
    } finally {
      this.saving.set(false);
    }
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
