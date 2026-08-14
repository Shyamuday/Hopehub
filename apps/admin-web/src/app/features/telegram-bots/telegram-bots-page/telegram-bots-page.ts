import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { AdminCanDirective } from '../../../core/directives/admin-can.directive';
import { ADMIN_PERMISSIONS } from '../../../core/admin-permissions';

@Component({
  selector: 'app-telegram-bots-page',
  imports: [DatePipe, FormsModule, AdminCanDirective],
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
    return bot.webhook?.ok ? bot.webhook.result?.url || 'No webhook URL set' : 'Unavailable';
  }

  webhookIssue(bot: any) {
    if (!bot.configured) return `Missing ${bot.tokenEnv}`;
    if (!bot.webhook) return 'Webhook info not loaded';
    if (!bot.webhook.ok) return bot.webhook.error;
    return bot.webhook.result?.last_error_message || '';
  }

  submissionCount(bot: any) {
    return Object.values(bot.summary?.submissions || {}).reduce(
      (total: number, value) => total + Number(value || 0),
      0,
    );
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
