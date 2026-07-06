import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';

type ChatMessage = {
  id: string;
  role: 'bot' | 'user' | 'operator';
  content: string;
  createdAt: string;
};

type ChatSession = {
  id: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  visitorEmail?: string | null;
  status: 'ACTIVE' | 'NEEDS_OPERATOR' | 'RESOLVED';
  concern?: string | null;
  operatorNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  _count?: { messages: number };
};

type StatusFilter = 'NEEDS_OPERATOR' | 'ACTIVE' | 'RESOLVED' | 'ALL';

@Component({
  selector: 'app-chat-inbox-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-inbox-page.html',
  styleUrl: './chat-inbox-page.scss'
})
export class ChatInboxPage {
  readonly sessions = signal<ChatSession[]>([]);
  readonly selected = signal<ChatSession | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly mutating = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly statusFilter = signal<StatusFilter>('NEEDS_OPERATOR');
  readonly pendingCount = signal(0);

  resolveNote = '';
  replyText = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const filter = this.statusFilter();
      const res = await this.api.listChatSessions(filter === 'ALL' ? undefined : filter);
      this.sessions.set(res.sessions);

      if (filter !== 'NEEDS_OPERATOR') {
        const pending = await this.api.listChatSessions('NEEDS_OPERATOR');
        this.pendingCount.set(pending.pagination.total);
      } else {
        this.pendingCount.set(res.pagination.total);
      }
    } catch {
      this.error.set('Could not load chat sessions.');
    } finally {
      this.loading.set(false);
    }
  }

  async setFilter(status: StatusFilter) {
    this.statusFilter.set(status);
    this.selected.set(null);
    await this.load();
  }

  async selectSession(id: string) {
    this.detailLoading.set(true);
    this.message.set('');
    try {
      const res = await this.api.getChatSession(id);
      this.selected.set(res.session);
    } catch {
      this.error.set('Could not load session.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  async resolve() {
    const session = this.selected();
    if (!session) return;
    this.mutating.set(true);
    try {
      await this.api.resolveChatSession(session.id, this.resolveNote || undefined);
      this.message.set('Session marked as resolved.');
      this.resolveNote = '';
      await this.load();
      const updated = await this.api.getChatSession(session.id);
      this.selected.set(updated.session);
    } catch {
      this.error.set('Could not resolve session.');
    } finally {
      this.mutating.set(false);
    }
  }

  async sendReply() {
    const session = this.selected();
    const text = this.replyText.trim();
    if (!session || !text) return;
    this.mutating.set(true);
    try {
      await this.api.sendChatOperatorMessage(session.id, text);
      this.replyText = '';
      const updated = await this.api.getChatSession(session.id);
      this.selected.set(updated.session);
    } catch {
      this.error.set('Could not send message.');
    } finally {
      this.mutating.set(false);
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'NEEDS_OPERATOR': return 'Needs follow-up';
      case 'ACTIVE': return 'Active';
      case 'RESOLVED': return 'Resolved';
      default: return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'NEEDS_OPERATOR': return 'badge-warn';
      case 'ACTIVE': return 'badge-info';
      case 'RESOLVED': return 'badge-ok';
      default: return '';
    }
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  sessionPreview(s: ChatSession): string {
    const first = s.messages?.[0];
    if (s.concern) return s.concern;
    if (first?.role === 'user') return first.content;
    return first?.content?.slice(0, 80) ?? 'New conversation';
  }
}
