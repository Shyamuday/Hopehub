import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';

@Component({
  selector: 'app-notifications-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './notifications-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './notifications-page.scss'
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

  templateForm = { code: '', name: '', title: '', body: '', channel: 'IN_APP', isActive: true };
  broadcastForm = {
    title: '',
    body: '',
    channel: 'IN_APP',
    audience: 'ALL_PATIENTS',
    audienceRole: 'PATIENT',
    templateId: ''
  };

  readonly channels = ['IN_APP', 'SMS', 'WHATSAPP', 'EMAIL', 'PUSH'];
  readonly audiences = [
    { value: 'ALL_PATIENTS', label: 'All patients' },
    { value: 'ALL_DOCTORS', label: 'All doctors' },
    { value: 'ROLE', label: 'Specific role' }
  ];
  readonly roles = [
    'PATIENT', 'DOCTOR', 'ADMIN', 'HR', 'RECEPTIONIST', 'CLINIC_MANAGER',
    'ACCOUNTANT', 'SUPPLIER', 'WAREHOUSE_MANAGER', 'DELIVERY_EXECUTIVE', 'DIAGNOSTIC_PARTNER'
  ];

  ngOnInit(): void { void this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const [templatesRes, broadcastsRes] = await Promise.all([
        this.api.getNotificationTemplates(),
        this.api.getNotificationBroadcasts()
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
    this.templateForm = { code: '', name: '', title: '', body: '', channel: 'IN_APP', isActive: true };
    this.error.set('');
    this.modal.set('create');
  }

  openEditTemplate(template: any) {
    this.selected.set(template);
    this.templateForm = {
      code: template.code,
      name: template.name,
      title: template.title,
      body: template.body,
      channel: template.channel,
      isActive: template.isActive !== false
    };
    this.error.set('');
    this.modal.set('edit');
  }

  openSendBroadcast(template?: any) {
    this.broadcastForm = {
      title: template?.title ?? '',
      body: template?.body ?? '',
      channel: template?.channel ?? 'IN_APP',
      audience: 'ALL_PATIENTS',
      audienceRole: 'PATIENT',
      templateId: template?.id ?? ''
    };
    this.error.set('');
    this.modal.set('send');
  }

  closeModal() { this.modal.set(null); }

  async saveTemplate() {
    if (!this.templateForm.name || !this.templateForm.title || !this.templateForm.body) {
      this.error.set('Name, title, and body are required.');
      return;
    }
    this.saving.set(true);
    try {
      if (this.modal() === 'create') {
        if (!this.templateForm.code) {
          this.error.set('Code is required.');
          return;
        }
        await this.api.createNotificationTemplate(this.templateForm);
        this.showToast('Template created.');
      } else {
        await this.api.updateNotificationTemplate(this.selected()!.id, {
          name: this.templateForm.name,
          title: this.templateForm.title,
          body: this.templateForm.body,
          channel: this.templateForm.channel,
          isActive: this.templateForm.isActive
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
    if (!this.broadcastForm.title || !this.broadcastForm.body) {
      this.error.set('Title and body are required.');
      return;
    }
    this.saving.set(true);
    try {
      const result = await this.api.sendNotificationBroadcast({
        ...this.broadcastForm,
        templateId: this.broadcastForm.templateId || undefined
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
