import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AdminApi } from '../../core/services/admin-api';

type GroupHelpConfigEntry = {
  key: string;
  label: string;
  description: string;
  section: 'connection' | 'messages' | 'moderation' | 'commands';
  type: 'text' | 'textarea' | 'number' | 'select';
  maxLength: number;
  placeholder?: string;
  options?: string[];
  value: string;
};

type CommandItem = {
  id: string;
  title: string;
  helper: string;
  valueKey: string;
  imageUrlKey?: string;
  templateKey: string;
  placeholder: 'message' | 'value' | 'lines';
  applyMode: 'TELEGRAM_ADMIN_CONFIRMATION' | 'DIRECT_PIN';
};

const IMAGE_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;

const SECTION_LABELS: Record<GroupHelpConfigEntry['section'], string> = {
  connection: 'Connection',
  messages: 'Messages',
  moderation: 'Moderation',
  commands: 'Command templates',
};

@Component({
  selector: 'app-group-help-page',
  imports: [CommonModule],
  templateUrl: './group-help-page.html',
  styleUrl: './group-help-page.scss',
})
export class GroupHelpPage {
  readonly config = signal<GroupHelpConfigEntry[]>([]);
  readonly localValues = signal<Record<string, string>>({});
  readonly tokenConfigured = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly sending = signal(false);
  readonly testing = signal(false);
  readonly clearingMenu = signal(false);
  readonly applying = signal('');
  readonly uploadingImage = signal('');
  readonly copied = signal('');
  readonly telegramApplyUrl = signal('');
  readonly message = signal('');
  readonly error = signal('');
  readonly selectedDirectMessageKey = signal('telegramGroupHelpPinnedMessage');
  readonly pinDirectMessage = signal(false);
  readonly capabilityGroups = signal<Array<{ title: string; options: readonly string[] }>>([]);

  readonly sectionOrder: Array<GroupHelpConfigEntry['section']> = [
    'connection',
    'messages',
    'moderation',
    'commands',
  ];
  readonly sectionLabels = SECTION_LABELS;

  messageCommands: CommandItem[] = [];
  moderationCommands: CommandItem[] = [];

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.getTelegramGroupHelpConfig();
      this.config.set(res.config);
      this.tokenConfigured.set(res.tokenConfigured);
      const actions = (res.actions || []).map((action) => ({
        ...action,
        helper: action.description,
      }));
      this.messageCommands = actions.filter((action) => Boolean(action.imageUrlKey));
      this.moderationCommands = actions.filter((action) => !action.imageUrlKey);
      this.capabilityGroups.set(res.capabilityGroups || []);
      this.localValues.set(Object.fromEntries(res.config.map((entry) => [entry.key, entry.value])));
    } catch {
      this.error.set('Could not load Group Help config.');
    } finally {
      this.loading.set(false);
    }
  }

  fieldsFor(section: GroupHelpConfigEntry['section']) {
    return this.config().filter((entry) => entry.section === section);
  }

  messageOptions() {
    return this.messageCommands.map((item) => ({
      key: item.valueKey,
      label: item.title,
      imageUrlKey: item.imageUrlKey,
    }));
  }

  value(key: string) {
    return this.localValues()[key] ?? '';
  }

  update(key: string, value: string) {
    this.localValues.update((current) => ({ ...current, [key]: value }));
  }

  async saveAll() {
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const entries = this.config().map((entry) => ({
        key: entry.key,
        value: this.value(entry.key),
      }));
      const res = await this.api.saveTelegramGroupHelpConfig(entries);
      this.config.set(res.config as GroupHelpConfigEntry[]);
      this.localValues.set(
        Object.fromEntries(
          (res.config as GroupHelpConfigEntry[]).map((entry) => [entry.key, entry.value]),
        ),
      );
      this.message.set('Group Help config saved.');
      return true;
    } catch {
      this.error.set('Could not save Group Help config.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async testConnection() {
    this.testing.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.api.testTelegramGroupHelpConnection();
      if (!result.ok) {
        this.error.set(result.message || 'Group Help bot connection failed.');
        return;
      }
      this.tokenConfigured.set(result.tokenConfigured);
      this.message.set(
        result.chatError
          ? `Bot connected, but the group could not be reached: ${result.chatError}`
          : 'Bot token and configured Telegram group are connected.',
      );
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not test Group Help connection.');
    } finally {
      this.testing.set(false);
    }
  }

  async clearWebsiteMenu() {
    this.clearingMenu.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.api.clearTelegramGroupHelpMenu();
      this.message.set('Old website menu removed. Telegram now shows the default bot menu.');
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not clear the Group Help bot menu.');
    } finally {
      this.clearingMenu.set(false);
    }
  }

  async apply(item: CommandItem) {
    this.applying.set(item.id);
    this.error.set('');
    this.message.set('');
    this.telegramApplyUrl.set('');
    try {
      if (!(await this.saveAll())) return;
      const result = await this.api.applyTelegramGroupHelpAction(item.id);
      if (result.mode === 'APPLIED') {
        this.message.set(`${item.title} applied to the configured Telegram group.`);
        return;
      }
      if (!result.command || !result.botUrl) {
        throw new Error('Group Help did not return an admin command.');
      }
      await navigator.clipboard.writeText(result.command);
      this.telegramApplyUrl.set(result.botUrl);
      window.open(result.botUrl, '_blank', 'noopener,noreferrer');
      this.message.set(
        `${item.title} command copied. Telegram opened—send it as a group admin to confirm.`,
      );
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || `Could not apply ${item.title}.`);
    } finally {
      this.applying.set('');
    }
  }

  commandFor(item: CommandItem) {
    const template = this.value(item.templateKey) || '{message}';
    const raw = this.value(item.valueKey).trim();
    const imageUrl = item.imageUrlKey ? this.value(item.imageUrlKey).trim() : '';
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
    const command = template
      .replaceAll('{message}', raw)
      .replaceAll('{imageUrl}', imageUrl)
      .replaceAll('{value}', raw)
      .replaceAll('{lines}', lines);

    if (imageUrl && !template.includes('{imageUrl}')) {
      return `${command}\n${imageUrl}`;
    }
    return command.trim();
  }

  imageUrlForMessageKey(messageKey: string) {
    const option = this.messageOptions().find((item) => item.key === messageKey);
    return option?.imageUrlKey ? this.value(option.imageUrlKey).trim() : '';
  }

  async uploadImage(event: Event, item: CommandItem) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !item.imageUrlKey) return;

    if (!file.type.startsWith('image/')) {
      this.error.set('Please choose an image file.');
      return;
    }
    if (file.size > IMAGE_UPLOAD_LIMIT_BYTES) {
      this.error.set('Image must be 5 MB or smaller.');
      return;
    }

    this.uploadingImage.set(item.id);
    this.error.set('');
    this.message.set('');
    try {
      const uploaded = await this.api.uploadTelegramGroupHelpImage(file);
      this.update(item.imageUrlKey, uploaded.fileUrl);
      this.message.set(`${item.title} image uploaded. Save config to keep it.`);
    } catch {
      this.error.set('Could not upload image.');
    } finally {
      this.uploadingImage.set('');
    }
  }

  async copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(label);
      window.setTimeout(() => this.copied.set(''), 1600);
    } catch {
      this.error.set('Could not copy. Select the command text manually.');
    }
  }

  async sendDirect() {
    const message = this.value(this.selectedDirectMessageKey()).trim();
    if (!message) {
      this.error.set('Select a message with content first.');
      return;
    }
    this.sending.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.api.sendTelegramGroupHelpMessage({
        message,
        imageUrl: this.imageUrlForMessageKey(this.selectedDirectMessageKey()),
        pin: this.pinDirectMessage(),
      });
      this.message.set(
        this.pinDirectMessage() ? 'Message sent and pinned in Telegram.' : 'Message sent.',
      );
    } catch {
      this.error.set(
        'Could not send. Check TELEGRAM_HOPEHUBBOT_TOKEN, group chat ID, and bot admin permissions.',
      );
    } finally {
      this.sending.set(false);
    }
  }
}
