import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { AdminCanDirective } from '../../../core/directives/admin-can.directive';
import { ADMIN_PERMISSIONS } from '../../../core/admin-permissions';
import {
  AdminFormDrawerComponent,
  type AdminFormStep,
} from '../../../shared/ui/admin-form-drawer.component';

@Component({
  selector: 'app-telegram-bots-page',
  imports: [DatePipe, FormsModule, AdminCanDirective, AdminFormDrawerComponent],
  templateUrl: './telegram-bots-page.html',
  styleUrl: './telegram-bots-page.scss',
})
export class TelegramBotsPage implements OnInit {
  private api = inject(AdminApi);
  readonly managePermission = ADMIN_PERMISSIONS.NOTIFICATIONS_WRITE;

  bots = signal<any[]>([]);
  sessions = signal<any[]>([]);
  events = signal<any[]>([]);
  controls = signal<any[]>([]);
  controlValues = signal<Record<string, string>>({});
  loading = signal(true);
  saving = signal('');
  error = signal('');
  toast = signal('');
  dropPendingUpdates = signal(false);
  publicApiUrl = signal('');
  configurationOpen = signal(false);
  configurationStep = signal(0);
  private configurationSnapshot: {
    controls: Record<string, string>;
    publicApiUrl: string;
    dropPendingUpdates: boolean;
  } | null = null;

  linkedSessions = computed(() => this.sessions().filter((session) => session.linkedUserId).length);
  unlinkedSessions = computed(() => this.sessions().length - this.linkedSessions());
  controlGroups = computed(() =>
    ['Protection', 'Confession bot', 'Contact bot', 'Rules bot']
      .map((name) => ({
        name,
        controls: this.controls().filter((control) => control.group === name),
      }))
      .filter((group) => group.controls.length),
  );
  configurationSteps = computed<AdminFormStep[]>(() => [
    { id: 'setup', label: 'Setup' },
    ...this.controlGroups().map((group) => ({
      id: group.name.toLowerCase().replace(/\s+/g, '-'),
      label: group.name.replace(' bot', ''),
    })),
    { id: 'review', label: 'Review' },
  ]);
  activeControlGroup = computed(() => {
    const index = this.configurationStep() - 1;
    return index >= 0 && index < this.controlGroups().length ? this.controlGroups()[index] : null;
  });
  configurationTitle = computed(() => {
    if (this.configurationStep() === 0) return 'Connection setup';
    if (this.activeControlGroup()) return this.activeControlGroup()!.name;
    return 'Review configuration';
  });
  configurationDescription = computed(() => {
    if (this.configurationStep() === 0) return 'Choose how managed bots connect to Telegram.';
    if (this.activeControlGroup())
      return 'Update only the settings for this part of the bot system.';
    return 'Review the changes before saving them.';
  });
  configurationBusy = computed(() => this.saving() === 'configuration');
  configurationNextDisabled = computed(
    () => this.configurationStep() === 0 && !this.isPublicApiUrlValid(),
  );

  ngOnInit(): void {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [response, controlsResponse] = await Promise.all([
        this.api.getTelegramBots(),
        this.api.getTelegramBotControls(),
      ]);
      this.bots.set(response.bots);
      this.sessions.set(response.sessions);
      this.events.set(response.events);
      this.applyControls(controlsResponse.controls);
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Could not load Telegram bot status.');
    } finally {
      this.loading.set(false);
    }
  }

  async setup(bot: any) {
    this.saving.set(bot.slug);
    try {
      await this.api.setupTelegramBot(bot.slug, this.setupPayload());
      this.showToast(`${bot.name} webhook and commands updated.`);
      await this.load();
    } catch (e: any) {
      this.showToast(e?.error?.message || `Could not setup ${bot.name}.`);
    } finally {
      this.saving.set('');
    }
  }

  async setupAll() {
    this.saving.set('all');
    try {
      await this.api.setupAllTelegramBots(this.setupPayload());
      this.showToast('All Telegram bot webhooks and commands updated.');
      await this.load();
    } catch (e: any) {
      this.showToast(e?.error?.message || 'Could not setup all Telegram bots.');
    } finally {
      this.saving.set('');
    }
  }

  openConfiguration() {
    this.configurationSnapshot = {
      controls: { ...this.controlValues() },
      publicApiUrl: this.publicApiUrl(),
      dropPendingUpdates: this.dropPendingUpdates(),
    };
    this.configurationStep.set(0);
    this.configurationOpen.set(true);
  }

  closeConfiguration() {
    if (this.configurationBusy()) return;
    if (this.configurationSnapshot) {
      this.controlValues.set({ ...this.configurationSnapshot.controls });
      this.publicApiUrl.set(this.configurationSnapshot.publicApiUrl);
      this.dropPendingUpdates.set(this.configurationSnapshot.dropPendingUpdates);
    }
    this.configurationSnapshot = null;
    this.configurationOpen.set(false);
    this.configurationStep.set(0);
  }

  nextConfigurationStep() {
    if (this.configurationNextDisabled()) return;
    this.configurationStep.update((step) =>
      Math.min(step + 1, this.configurationSteps().length - 1),
    );
  }

  previousConfigurationStep() {
    this.configurationStep.update((step) => Math.max(0, step - 1));
  }

  async saveConfiguration() {
    if (this.configurationNextDisabled()) return;
    this.saving.set('configuration');
    try {
      const controlsResponse = await this.api.saveTelegramBotControls(
        this.controls().map((control) => ({
          key: control.key,
          value: this.controlValue(control.key),
        })),
      );
      await this.api.setupAllTelegramBots(this.setupPayload());
      this.applyControls(controlsResponse.controls);
      this.configurationSnapshot = null;
      this.configurationOpen.set(false);
      this.configurationStep.set(0);
      this.showToast('Bot configuration applied successfully.');
      await this.load();
    } catch (e: any) {
      this.showToast(e?.error?.message || 'Could not apply bot configuration.');
    } finally {
      this.saving.set('');
    }
  }

  async unlink(session: any) {
    this.saving.set(session.id);
    try {
      const response = await this.api.unlinkTelegramBotSession(session.id);
      this.sessions.update((list) =>
        list.map((row) => (row.id === session.id ? { ...row, ...response.session } : row)),
      );
      this.showToast(`${session.displayName || session.chatId} unlinked.`);
    } catch (e: any) {
      this.showToast(e?.error?.message || 'Could not unlink Telegram session.');
    } finally {
      this.saving.set('');
    }
  }

  controlValue(key: string) {
    return this.controlValues()[key] ?? '';
  }

  setControlValue(key: string, value: string) {
    this.controlValues.update((current) => ({ ...current, [key]: String(value) }));
  }

  async saveControlGroup(group: { name: string; controls: any[] }) {
    const savingKey = `controls:${group.name}`;
    this.saving.set(savingKey);
    try {
      const response = await this.api.saveTelegramBotControls(
        group.controls.map((control) => ({
          key: control.key,
          value: this.controlValue(control.key),
        })),
      );
      this.applyControls(response.controls);
      this.showToast(`${group.name} settings saved.`);
    } catch (e: any) {
      this.showToast(e?.error?.message || `Could not save ${group.name.toLowerCase()} settings.`);
    } finally {
      this.saving.set('');
    }
  }

  webhookUrl(bot: any) {
    return bot.webhook?.ok ? bot.webhook.result?.url || 'Connection not set' : 'Unavailable';
  }

  webhookIssue(bot: any) {
    if (!bot.configured) return 'Bot token is not configured';
    if (!bot.webhook) return 'Connection details are not available';
    if (!bot.webhook.ok) return bot.webhook.error;
    return bot.webhook.result?.last_error_message || '';
  }

  submissionCount(bot: any) {
    return Object.values(bot.summary?.submissions || {}).reduce(
      (total: number, value) => total + Number(value || 0),
      0,
    );
  }

  private isPublicApiUrlValid() {
    const value = this.publicApiUrl().trim();
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }

  private setupPayload() {
    return {
      dropPendingUpdates: this.dropPendingUpdates(),
      ...(this.publicApiUrl().trim() ? { publicApiUrl: this.publicApiUrl().trim() } : {}),
    };
  }

  private applyControls(controls: any[]) {
    this.controls.set(controls);
    this.controlValues.set(
      Object.fromEntries(controls.map((control) => [control.key, String(control.value ?? '')])),
    );
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
