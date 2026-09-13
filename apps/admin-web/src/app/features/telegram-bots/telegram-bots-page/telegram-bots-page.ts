import { DatePipe } from '@angular/common';
import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { AdminCanDirective } from '../../../core/directives/admin-can.directive';
import { ADMIN_PERMISSIONS } from '../../../core/admin-permissions';
import {
  AdminFormDrawerComponent,
  type AdminFormStep,
} from '../../../shared/ui/admin-form-drawer.component';
import { AdminPageHeaderComponent } from '../../../shared/ui/admin-page-header.component';

@Component({
  selector: 'app-telegram-bots-page',
  imports: [
    DatePipe,
    FormsModule,
    AdminCanDirective,
    AdminFormDrawerComponent,
    AdminPageHeaderComponent,
  ],
  templateUrl: './telegram-bots-page.html',
  styleUrl: './telegram-bots-page.scss',
})
export class TelegramBotsPage implements OnInit {
  private api = inject(AdminApi);
  readonly managePermission = ADMIN_PERMISSIONS.NOTIFICATIONS_WRITE;

  bots = signal<any[]>([]);
  sessions = signal<any[]>([]);
  events = signal<any[]>([]);
  health = signal<any>(null);
  configurationHistory = signal<any[]>([]);
  controls = signal<any[]>([]);
  controlValues = signal<Record<string, string>>({});
  loading = signal(true);
  saving = signal('');
  error = signal('');
  toast = signal('');
  dropPendingUpdates = signal(false);
  refreshConnections = signal(false);
  sessionSearch = signal('');
  eventSearch = signal('');
  publicApiUrl = signal('');
  configurationOpen = signal(false);
  configurationStep = signal(0);
  private configurationSnapshot: {
    controls: Record<string, string>;
    publicApiUrl: string;
    dropPendingUpdates: boolean;
    refreshConnections: boolean;
  } | null = null;
  private readonly linkListControlKeys = new Set([
    'telegramConfessionMenuLinks',
    'telegramContactMenuLinks',
    'telegramRulesMenuLinks',
  ]);

  linkedSessions = computed(() => this.sessions().filter((session) => session.linkedUserId).length);
  unlinkedSessions = computed(() => this.sessions().length - this.linkedSessions());
  visibleSessions = computed(() => {
    const query = this.sessionSearch().trim().toLocaleLowerCase();
    if (!query) return this.sessions();
    return this.sessions().filter((session) =>
      [
        session.displayName,
        session.username,
        session.chatId,
        session.botKind,
        session.linkedUser?.name,
        session.linkedUser?.email,
        session.linkedUser?.mobile,
      ].some((value) =>
        String(value || '')
          .toLocaleLowerCase()
          .includes(query),
      ),
    );
  });
  visibleEvents = computed(() => {
    const query = this.eventSearch().trim().toLocaleLowerCase();
    if (!query) return this.events();
    return this.events().filter((event) =>
      [event.eventType, event.botKind, event.chatId, event.updateId]
        .map((value) => String(value || '').toLocaleLowerCase())
        .some((value) => value.includes(query)),
    );
  });
  headerMetrics = computed(() => [
    {
      label: 'Configured',
      value: `${this.bots().filter((bot) => bot.configured).length}/${this.bots().length}`,
      tone: this.bots().every((bot) => bot.configured)
        ? ('success' as const)
        : ('warning' as const),
    },
    { label: 'Linked', value: this.linkedSessions(), tone: 'success' as const },
    {
      label: 'Failures',
      value:
        Number(this.health()?.failedWebhookUpdates || 0) +
        Number(this.health()?.failedGroupHelpCommands || 0) +
        Number(this.health()?.failedDeliveries || 0),
      tone: this.health()?.needsAttention ? ('danger' as const) : ('default' as const),
    },
  ]);
  controlGroups = computed(() =>
    ['Protection', 'Shared links', 'Confession bot', 'Contact bot', 'Rules bot']
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
  configurationNextDisabled = computed(() => {
    if (this.configurationStep() === 0)
      return this.refreshConnections() && !this.isPublicApiUrlValid();
    const group = this.activeControlGroup();
    return Boolean(
      group?.controls.some(
        (control) =>
          this.isLinkListControl(control.key) &&
          this.configuredLinks(control.key).some((link) => !this.isConfiguredLinkValid(link)),
      ),
    );
  });

  ngOnInit(): void {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [response, controlsResponse, historyResponse] = await Promise.all([
        this.api.getTelegramBots(),
        this.api.getTelegramBotControls(),
        this.api.getTelegramBotControlHistory(),
      ]);
      this.bots.set(response.bots);
      this.sessions.set(response.sessions);
      this.events.set(response.events);
      this.health.set(response.health || null);
      this.applyControls(controlsResponse.controls);
      this.configurationHistory.set(historyResponse.history || []);
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
      refreshConnections: this.refreshConnections(),
    };
    this.configurationStep.set(0);
    this.configurationOpen.set(true);
  }

  closeConfiguration() {
    if (this.configurationBusy()) return;
    if (
      this.hasUnsavedChanges() &&
      !confirm('Discard the unsaved Telegram bot configuration changes?')
    )
      return;
    if (this.configurationSnapshot) {
      this.controlValues.set({ ...this.configurationSnapshot.controls });
      this.publicApiUrl.set(this.configurationSnapshot.publicApiUrl);
      this.dropPendingUpdates.set(this.configurationSnapshot.dropPendingUpdates);
      this.refreshConnections.set(this.configurationSnapshot.refreshConnections);
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
      const refreshConnections = this.refreshConnections() || this.dropPendingUpdates();
      if (refreshConnections) await this.api.setupAllTelegramBots(this.setupPayload());
      this.applyControls(controlsResponse.controls);
      this.configurationSnapshot = null;
      this.configurationOpen.set(false);
      this.configurationStep.set(0);
      this.refreshConnections.set(false);
      this.dropPendingUpdates.set(false);
      this.showToast(
        refreshConnections
          ? 'Bot settings saved and connections refreshed.'
          : 'Bot settings saved.',
      );
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

  setRefreshConnections(value: boolean) {
    this.refreshConnections.set(value);
    if (!value) this.dropPendingUpdates.set(false);
  }

  isLinkListControl(key: string) {
    return this.linkListControlKeys.has(key);
  }

  configuredLinks(key: string) {
    const value = this.controlValue(key);
    if (!value.trim()) return [];
    return value.split(/\r?\n/).map((line) => {
      const [label = '', url = '', style = 'primary'] = line.split('|').map((part) => part.trim());
      return { label, url, style };
    });
  }

  addConfiguredLink(key: string) {
    const links = this.configuredLinks(key);
    if (links.length >= 8) return;
    this.writeConfiguredLinks(key, [...links, { label: '', url: '', style: 'primary' }]);
  }

  updateConfiguredLink(
    key: string,
    index: number,
    field: 'label' | 'url' | 'style',
    value: string,
  ) {
    const links = this.configuredLinks(key);
    if (!links[index]) return;
    links[index] = { ...links[index], [field]: value };
    this.writeConfiguredLinks(key, links);
  }

  removeConfiguredLink(key: string, index: number) {
    this.writeConfiguredLinks(
      key,
      this.configuredLinks(key).filter((_, linkIndex) => linkIndex !== index),
    );
  }

  isConfiguredLinkValid(link: { label: string; url: string; style: string }) {
    if (!link.label.trim() || !['primary', 'success', 'danger'].includes(link.style)) return false;
    try {
      return new URL(link.url).protocol === 'https:';
    } catch {
      return false;
    }
  }

  changedControlCount() {
    if (!this.configurationSnapshot) return 0;
    return this.controls().filter(
      (control) =>
        this.controlValue(control.key) !==
        (this.configurationSnapshot?.controls[control.key] ?? ''),
    ).length;
  }

  hasUnsavedChanges() {
    if (!this.configurationOpen() || !this.configurationSnapshot) return false;
    return (
      this.changedControlCount() > 0 ||
      this.publicApiUrl() !== this.configurationSnapshot.publicApiUrl ||
      this.dropPendingUpdates() !== this.configurationSnapshot.dropPendingUpdates ||
      this.refreshConnections() !== this.configurationSnapshot.refreshConnections
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  protectUnsavedChanges(event: BeforeUnloadEvent) {
    if (!this.hasUnsavedChanges()) return;
    event.preventDefault();
  }

  canPreviewGroup(name: string) {
    return ['Shared links', 'Confession bot', 'Contact bot', 'Rules bot'].includes(name);
  }

  async previewControlGroup(group: { name: string; controls: any[] }) {
    this.saving.set(`preview:${group.name}`);
    try {
      await this.api.previewTelegramBotControls(
        group.name,
        group.controls.map((control) => ({
          key: control.key,
          value: this.controlValue(control.key),
        })),
      );
      this.showToast(`Preview sent to the private Telegram staff group.`);
    } catch (e: any) {
      this.showToast(e?.error?.message || 'Could not send the preview.');
    } finally {
      this.saving.set('');
    }
  }

  async restoreConfiguration(id: string) {
    this.saving.set(`restore:${id}`);
    try {
      const result = await this.api.restoreTelegramBotControls(id);
      this.showToast(`Restored ${result.restored} setting(s).`);
      await this.load();
      this.configurationOpen.set(false);
    } catch (e: any) {
      this.showToast(e?.error?.message || 'Could not restore this configuration.');
    } finally {
      this.saving.set('');
    }
  }

  private writeConfiguredLinks(
    key: string,
    links: Array<{ label: string; url: string; style: string }>,
  ) {
    this.setControlValue(
      key,
      links.map((link) => `${link.label} | ${link.url} | ${link.style}`).join('\n'),
    );
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
