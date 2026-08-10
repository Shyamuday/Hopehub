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
  templateKey: string;
  placeholder: 'message' | 'value' | 'lines';
};

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
  readonly copied = signal('');
  readonly message = signal('');
  readonly error = signal('');
  readonly selectedDirectMessageKey = signal('telegramGroupHelpPinnedMessage');
  readonly pinDirectMessage = signal(false);

  readonly sectionOrder: Array<GroupHelpConfigEntry['section']> = [
    'connection',
    'messages',
    'moderation',
    'commands',
  ];
  readonly sectionLabels = SECTION_LABELS;

  readonly messageCommands: CommandItem[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      helper: 'Copy this into the GroupHelp bot/group to update the join welcome.',
      valueKey: 'telegramGroupHelpWelcomeMessage',
      templateKey: 'telegramGroupHelpWelcomeCommandTemplate',
      placeholder: 'message',
    },
    {
      id: 'rules',
      title: 'Rules',
      helper: 'Copy this command when you want GroupHelp rules to match HopeHub rules.',
      valueKey: 'telegramGroupHelpRulesMessage',
      templateKey: 'telegramGroupHelpRulesCommandTemplate',
      placeholder: 'message',
    },
    {
      id: 'support',
      title: 'Support command',
      helper: 'Suggested command for a /support or similar custom reply.',
      valueKey: 'telegramGroupHelpSupportMessage',
      templateKey: 'telegramGroupHelpSupportCommandTemplate',
      placeholder: 'message',
    },
    {
      id: 'pinned',
      title: 'Pinned intro',
      helper: 'Use this for a clean pinned group intro.',
      valueKey: 'telegramGroupHelpPinnedMessage',
      templateKey: 'telegramGroupHelpPinnedCommandTemplate',
      placeholder: 'message',
    },
    {
      id: 'recurring',
      title: 'Recurring reminder',
      helper: 'Use this for daily/weekly group reminders if your GroupHelp clone supports it.',
      valueKey: 'telegramGroupHelpRecurringMessage',
      templateKey: 'telegramGroupHelpRecurringCommandTemplate',
      placeholder: 'message',
    },
  ];

  readonly moderationCommands: CommandItem[] = [
    {
      id: 'captcha',
      title: 'Captcha',
      helper: 'Desired captcha state.',
      valueKey: 'telegramGroupHelpCaptchaMode',
      templateKey: 'telegramGroupHelpCaptchaCommandTemplate',
      placeholder: 'value',
    },
    {
      id: 'warn-limit',
      title: 'Warn limit',
      helper: 'Number of warnings before action.',
      valueKey: 'telegramGroupHelpWarnLimit',
      templateKey: 'telegramGroupHelpWarnLimitCommandTemplate',
      placeholder: 'value',
    },
    {
      id: 'links',
      title: 'Link policy',
      helper: 'Desired link handling policy.',
      valueKey: 'telegramGroupHelpLinkPolicy',
      templateKey: 'telegramGroupHelpLinkPolicyCommandTemplate',
      placeholder: 'value',
    },
    {
      id: 'banned-words',
      title: 'Banned words',
      helper: 'One word/phrase per line from the moderation field.',
      valueKey: 'telegramGroupHelpBannedWords',
      templateKey: 'telegramGroupHelpBannedWordsCommandTemplate',
      placeholder: 'lines',
    },
  ];

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
    } catch {
      this.error.set('Could not save Group Help config.');
    } finally {
      this.saving.set(false);
    }
  }

  commandFor(item: CommandItem) {
    const template = this.value(item.templateKey) || '{message}';
    const raw = this.value(item.valueKey).trim();
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
    return template
      .replaceAll('{message}', raw)
      .replaceAll('{value}', raw)
      .replaceAll('{lines}', lines);
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
        pin: this.pinDirectMessage(),
      });
      this.message.set(
        this.pinDirectMessage() ? 'Message sent and pinned in Telegram.' : 'Message sent.',
      );
    } catch {
      this.error.set(
        'Could not send. Check TELEGRAM_GROUP_HELP_BOT_TOKEN, group chat ID, and bot admin permissions.',
      );
    } finally {
      this.sending.set(false);
    }
  }
}
