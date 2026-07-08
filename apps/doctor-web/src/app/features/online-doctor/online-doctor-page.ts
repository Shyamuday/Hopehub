import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { OnlineDoctorService } from '../../core/services/online-doctor.service';

@Component({
  selector: 'app-online-doctor-page',
  imports: [CommonModule, FormField],
  templateUrl: './online-doctor-page.html',
  styleUrl: './online-doctor-page.scss'
})
export class OnlineDoctorPage implements OnDestroy {
  private readonly online = inject(OnlineDoctorService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly diseases = signal<Array<{ id: string; name: string }>>([]);
  readonly profile = this.online.profile;

  readonly settingsModel = signal({
    category: 'GENERALIST' as 'GENERALIST' | 'SPECIALIST',
    specialtyDiseaseIds: [] as string[],
    acceptsChat: true,
    acceptsVoiceCall: true
  });
  readonly settingsForm = form(this.settingsModel);

  constructor() {
    void this.load();
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
    } catch {
      this.error.set('Could not load online doctor settings.');
    } finally {
      this.loading.set(false);
    }
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
      this.message.set('You are offline.');
    } catch {
      this.error.set('Could not go offline.');
    } finally {
      this.saving.set(false);
    }
  }

  ngOnDestroy() {
    if (!this.isLive()) this.online.disconnectRealtime();
  }
}
