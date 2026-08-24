import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';

type Channel = {
  id: string;
  slug: string;
  name: string;
  category: string;
  chatId: string;
  isActive: boolean;
  requireApproval: boolean;
  minimumPostGapMinutes: number;
  sources?: Source[];
  _count?: { items: number };
};

type Source = {
  id: string;
  channelId: string;
  name: string;
  feedUrl: string;
  attribution?: string | null;
  isActive: boolean;
  autoApprove: boolean;
  fetchIntervalMinutes: number;
  lastFetchedAt?: string | null;
  lastError?: string | null;
};

type ContentItem = {
  id: string;
  title: string;
  summary?: string | null;
  postText: string;
  sourceUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'FAILED';
  createdAt: string;
  scheduledFor?: string | null;
  channel: { id: string; name: string };
  source: { name: string; attribution?: string | null };
  error?: string | null;
};

const emptyChannel = () => ({
  id: '',
  slug: '',
  name: '',
  category: '',
  chatId: '',
  isActive: false,
  requireApproval: true,
  minimumPostGapMinutes: 120,
});

const emptySource = () => ({
  id: '',
  channelId: '',
  name: '',
  feedUrl: '',
  attribution: '',
  isActive: true,
  autoApprove: false,
  fetchIntervalMinutes: 180,
});

@Component({
  selector: 'app-telegram-content-network-page',
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './telegram-content-network-page.html',
  styleUrl: './telegram-content-network-page.scss',
})
export class TelegramContentNetworkPage implements OnInit {
  private readonly api = inject(AdminApi);

  readonly channels = signal<Channel[]>([]);
  readonly items = signal<ContentItem[]>([]);
  readonly loading = signal(true);
  readonly busy = signal('');
  readonly message = signal('');
  readonly error = signal('');

  channelForm = emptyChannel();
  sourceForm = emptySource();
  reviewSchedule = '';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.getTelegramContentNetwork();
      this.channels.set(response.channels as Channel[]);
      this.items.set(response.items as ContentItem[]);
      if (!this.sourceForm.channelId && response.channels.length) {
        this.sourceForm.channelId = response.channels[0].id;
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  editChannel(channel: Channel): void {
    this.channelForm = {
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      category: channel.category,
      chatId: channel.chatId,
      isActive: channel.isActive,
      requireApproval: channel.requireApproval,
      minimumPostGapMinutes: channel.minimumPostGapMinutes,
    };
  }

  resetChannel(): void {
    this.channelForm = emptyChannel();
  }

  editSource(source: Source): void {
    this.sourceForm = {
      id: source.id,
      channelId: source.channelId,
      name: source.name,
      feedUrl: source.feedUrl,
      attribution: source.attribution || '',
      isActive: source.isActive,
      autoApprove: source.autoApprove,
      fetchIntervalMinutes: source.fetchIntervalMinutes,
    };
  }

  resetSource(): void {
    const selectedChannelId = this.channels()[0]?.id || '';
    this.sourceForm = { ...emptySource(), channelId: selectedChannelId };
  }

  async saveChannel(): Promise<void> {
    if (
      !this.channelForm.slug ||
      !this.channelForm.name ||
      !this.channelForm.category ||
      !this.channelForm.chatId
    ) {
      this.error.set('Enter the channel name, category, Telegram chat ID, and a short slug.');
      return;
    }
    await this.run('channel', async () => {
      const { id, ...payload } = this.channelForm;
      if (id) await this.api.updateTelegramContentChannel(id, payload);
      else await this.api.createTelegramContentChannel(payload);
      this.message.set(
        id ? 'Channel saved.' : 'Channel added. Add one or more public RSS sources next.',
      );
      this.resetChannel();
    });
  }

  async saveSource(): Promise<void> {
    if (!this.sourceForm.channelId || !this.sourceForm.name || !this.sourceForm.feedUrl) {
      this.error.set('Choose a channel and enter the source name and public HTTPS RSS/Atom URL.');
      return;
    }
    await this.run('source', async () => {
      const { id, ...payload } = this.sourceForm;
      const sourcePayload = { ...payload, attribution: payload.attribution || payload.name };
      if (id) await this.api.updateTelegramContentSource(id, sourcePayload);
      else await this.api.createTelegramContentSource(sourcePayload);
      this.message.set(
        id ? 'Source saved.' : 'Source added. Use Refresh to collect reviewable drafts.',
      );
      this.resetSource();
    });
  }

  async refreshSource(source: Source): Promise<void> {
    await this.run(`refresh:${source.id}`, async () => {
      const result = await this.api.refreshTelegramContentSource(source.id);
      this.message.set(
        `${source.name}: ${result.result.created} new draft(s) from ${result.result.found} feed item(s). Existing links were skipped.`,
      );
    });
  }

  async review(item: ContentItem, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    await this.run(`review:${item.id}`, async () => {
      const scheduledFor =
        status === 'APPROVED' && this.reviewSchedule
          ? new Date(this.reviewSchedule).toISOString()
          : undefined;
      await this.api.reviewTelegramContentItem(item.id, { status, scheduledFor });
      this.message.set(
        status === 'APPROVED'
          ? 'Approved. The scheduler will publish it at the selected time.'
          : 'Draft rejected.',
      );
      this.reviewSchedule = '';
    });
  }

  async removeChannel(channel: Channel): Promise<void> {
    if (
      !confirm(
        `Delete ${channel.name} and its sources? Existing content items will also be removed.`,
      )
    )
      return;
    await this.run(`delete-channel:${channel.id}`, async () => {
      await this.api.deleteTelegramContentChannel(channel.id);
      this.message.set('Channel removed.');
    });
  }

  async removeSource(source: Source): Promise<void> {
    if (!confirm(`Remove ${source.name}? Its fetched drafts will also be removed.`)) return;
    await this.run(`delete-source:${source.id}`, async () => {
      await this.api.deleteTelegramContentSource(source.id);
      this.message.set('Source removed.');
    });
  }

  isBusy(key: string): boolean {
    return this.busy() === key;
  }

  private async run(key: string, action: () => Promise<void>): Promise<void> {
    this.busy.set(key);
    this.error.set('');
    try {
      await action();
      await this.load();
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.busy.set('');
    }
  }

  private errorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const body = (error as { error?: { error?: string; message?: string } }).error;
      if (body?.error || body?.message) return body.error || body.message || 'Request failed.';
    }
    return 'The request could not be completed. Check the channel permissions and RSS URL.';
  }
}
