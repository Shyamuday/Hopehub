import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { ConsultationChatPanelComponent } from '../../shared/consultation-chat-panel/consultation-chat-panel';
import { OnlineDoctorService } from '../../core/services/online-doctor.service';

type InstantConsult = {
  id: string;
  status: string;
  patient: { id: string; name: string; patientCode?: string | null };
  disease: { id: string; name: string };
};

@Component({
  selector: 'app-online-doctor-page',
  imports: [CommonModule, FormField, ConsultationChatPanelComponent],
  templateUrl: './online-doctor-page.html',
  styleUrl: './online-doctor-page.scss'
})
export class OnlineDoctorPage implements OnInit, OnDestroy {
  private readonly online = inject(OnlineDoctorService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly diseases = signal<Array<{ id: string; name: string }>>([]);
  readonly profile = this.online.profile;
  readonly instantConsults = signal<InstantConsult[]>([]);
  readonly selectedConsultId = signal('');
  readonly inboxLoading = signal(false);

  readonly settingsModel = signal({
    category: 'GENERALIST' as 'GENERALIST' | 'SPECIALIST',
    specialtyDiseaseIds: [] as string[],
    acceptsChat: true,
    acceptsVoiceCall: true
  });
  readonly settingsForm = form(this.settingsModel);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    void this.load();
    this.route.queryParamMap.subscribe((params) => {
      const id = params.get('consultationId');
      if (id) {
        this.selectedConsultId.set(id);
        if (this.isLive()) void this.loadInbox();
      }
    });
  }

  async load() {
    this.loading.set(true);
    try {
      const res = await this.online.loadProfile();
      this.online.profile.set(res.profile);
      this.diseases.set(res.diseases ?? []);
      this.settingsModel.set({
        category: res.profile.category,
        specialtyDiseaseIds: [...res.profile.specialtyDiseaseIds],
        acceptsChat: res.profile.acceptsChat,
        acceptsVoiceCall: res.profile.acceptsVoiceCall
      });
      if (this.isLive()) {
        void this.loadInbox();
        this.startInboxRefresh();
      }
    } catch {
      this.error.set('Could not load online doctor settings.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadInbox() {
    if (!this.isLive()) return;
    this.inboxLoading.set(true);
    try {
      const res = await this.online.loadInstantConsultations();
      this.instantConsults.set(res.consultations);
      const selected = this.selectedConsultId();
      if (!selected && res.consultations.length) {
        this.selectedConsultId.set(res.consultations[0].id);
      }
    } catch {
      this.instantConsults.set([]);
    } finally {
      this.inboxLoading.set(false);
    }
  }

  selectConsult(id: string) {
    this.selectedConsultId.set(id);
    void this.router.navigate([], { queryParams: { consultationId: id }, queryParamsHandling: 'merge' });
  }

  selectedConsult() {
    const id = this.selectedConsultId();
    return this.instantConsults().find((c) => c.id === id) ?? null;
  }

  isLive() {
    return ['ONLINE', 'BUSY', 'ON_CALL'].includes(this.profile()?.liveStatus ?? 'OFFLINE');
  }

  async saveSettings() {
    this.saving.set(true);
    this.message.set('');
    try {
      const m = this.settingsModel();
      const res = await this.online.saveProfile({
        enabled: true,
        category: m.category,
        specialtyDiseaseIds: m.specialtyDiseaseIds,
        acceptsChat: m.acceptsChat,
        acceptsVoiceCall: m.acceptsVoiceCall
      });
      this.online.profile.set(res.profile);
      this.message.set('Settings saved.');
    } catch {
      this.error.set('Could not save settings.');
    } finally {
      this.saving.set(false);
    }
  }

  toggleDisease(id: string) {
    this.settingsModel.update((m) => {
      const has = m.specialtyDiseaseIds.includes(id);
      return {
        ...m,
        specialtyDiseaseIds: has ? m.specialtyDiseaseIds.filter((x) => x !== id) : [...m.specialtyDiseaseIds, id]
      };
    });
  }

  async goOnline() {
    this.saving.set(true);
    try {
      await this.saveSettings();
      const res = await this.online.setLiveStatus({
        liveStatus: 'ONLINE',
        acceptsChat: this.settingsModel().acceptsChat,
        acceptsVoiceCall: this.settingsModel().acceptsVoiceCall
      });
      this.online.profile.set(res.profile);
      this.online.connectRealtime();
      this.message.set('You are now visible to patients.');
      void this.loadInbox();
      this.startInboxRefresh();
    } catch {
      this.error.set('Could not go online.');
    } finally {
      this.saving.set(false);
    }
  }

  async goOffline() {
    this.saving.set(true);
    try {
      const res = await this.online.setLiveStatus({ liveStatus: 'OFFLINE' });
      this.online.profile.set(res.profile);
      this.online.disconnectRealtime();
      this.stopInboxRefresh();
      this.instantConsults.set([]);
      this.selectedConsultId.set('');
      this.message.set('You are offline.');
    } catch {
      this.error.set('Could not go offline.');
    } finally {
      this.saving.set(false);
    }
  }

  private startInboxRefresh() {
    this.stopInboxRefresh();
    this.refreshTimer = setInterval(() => void this.loadInbox(), 20_000);
  }

  private stopInboxRefresh() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  }

  ngOnDestroy() {
    this.stopInboxRefresh();
    if (!this.isLive()) this.online.disconnectRealtime();
  }
}
