import { Injectable, computed, signal, OnDestroy } from '@angular/core';
import { ClinicApiClient } from '../../clinic-api/clinic-api.client';
import { API_PATHS } from '../constants/api-paths.constants';

export interface ChatMsg {
  id: string;
  role: 'bot' | 'user' | 'operator';
  content: string;
  createdAt: string;
  options?: string[];
  showBookButton?: boolean;
  showWhatsAppButton?: boolean;
  allowFreeText?: boolean;
}

const SESSION_KEY = 'vitalis_chat_session_id';
const VISITOR_KEY = 'vitalis_chat_visitor_key';

@Injectable({ providedIn: 'root' })
export class ChatbotService implements OnDestroy {
  private api = new ClinicApiClient();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly messages = signal<ChatMsg[]>([]);
  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly sessionId = signal<string | null>(null);
  readonly botName = signal('Dr. Priya');
  readonly activeOptions = signal<string[]>([]);

  readonly quickReplies = computed(() => this.activeOptions());

  constructor() {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) void this.loadSession(saved);
  }

  toggle() {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      if (!this.sessionId()) void this.startSession();
      else void this.refreshMessages();
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  open() {
    this.isOpen.set(true);
    if (!this.sessionId()) void this.startSession();
    else void this.refreshMessages();
    this.startPolling();
  }

  close() {
    this.isOpen.set(false);
    this.stopPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  /** Link anonymous chat to logged-in account (called after login). */
  async linkToUser() {
    const sid = this.sessionId();
    if (!sid || !this.api.backendToken) return;
    try {
      await this.api.apiFetch(API_PATHS.CHAT.LINK(sid), { method: 'PATCH' });
    } catch {
      // non-fatal
    }
  }

  async startSession() {
    this.isLoading.set(true);
    try {
      const res = await this.api.apiFetch<{
        sessionId: string;
        messages: ChatMsg[];
        botName: string;
        activeOptions?: string[];
      }>(API_PATHS.CHAT.START, {
        method: 'POST',
        body: JSON.stringify({
          visitorKey: this.getVisitorKey(),
          entryPage: typeof window !== 'undefined' ? window.location.pathname : undefined
        })
      });
      this.sessionId.set(res.sessionId);
      this.botName.set(res.botName);
      this.messages.set(res.messages);
      this.activeOptions.set(res.activeOptions ?? res.messages.at(-1)?.options ?? []);
      localStorage.setItem(SESSION_KEY, res.sessionId);
      if (this.api.backendToken) void this.linkToUser();
    } finally {
      this.isLoading.set(false);
    }
  }

  async sendMessage(content: string) {
    const sid = this.sessionId();
    if (!sid || this.isLoading()) return;

    this.activeOptions.set([]);

    const tempId = 'tmp_' + Date.now();
    this.messages.update((msgs) => [
      ...msgs,
      { id: tempId, role: 'user', content, createdAt: new Date().toISOString() }
    ]);

    this.isLoading.set(true);
    try {
      const res = await this.api.apiFetch<{
        userMessage: ChatMsg;
        botMessage: ChatMsg;
        activeOptions?: string[];
      }>(API_PATHS.CHAT.MESSAGE(sid), {
        method: 'POST',
        body: JSON.stringify({ content })
      });

      this.messages.update((msgs) => [
        ...msgs.filter((m) => m.id !== tempId),
        res.userMessage,
        res.botMessage
      ]);
      this.activeOptions.set(res.activeOptions ?? res.botMessage.options ?? []);
    } catch {
      this.messages.update((msgs) => msgs.filter((m) => m.id !== tempId));
      const lastBot = [...this.messages()].reverse().find((m) => m.role === 'bot');
      this.activeOptions.set(lastBot?.options ?? []);
    } finally {
      this.isLoading.set(false);
    }
  }

  selectOption(option: string) {
    void this.sendMessage(option);
  }

  private getVisitorKey(): string {
    let key = localStorage.getItem(VISITOR_KEY);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, key);
    }
    return key;
  }

  private async loadSession(id: string) {
    try {
      const res = await this.api.apiFetch<{
        messages: ChatMsg[];
        activeOptions?: string[];
      }>(API_PATHS.CHAT.SESSION(id));
      this.sessionId.set(id);
      this.messages.set(res.messages);
      const lastBot = [...res.messages].reverse().find((m) => m.role === 'bot');
      this.activeOptions.set(res.activeOptions ?? lastBot?.options ?? []);
      if (this.api.backendToken) void this.linkToUser();
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  resetSession() {
    this.stopPolling();
    localStorage.removeItem(SESSION_KEY);
    this.sessionId.set(null);
    this.messages.set([]);
    this.activeOptions.set([]);
    void this.startSession();
  }

  async refreshMessages() {
    const sid = this.sessionId();
    if (!sid) return;
    try {
      const res = await this.api.apiFetch<{
        messages: ChatMsg[];
        activeOptions?: string[];
        session?: { status: string };
      }>(API_PATHS.CHAT.SESSION(sid));
      const prevCount = this.messages().length;
      this.messages.set(res.messages);
      if (res.messages.length > prevCount) {
        const lastBot = [...res.messages].reverse().find((m) => m.role === 'bot');
        if (lastBot?.options?.length) {
          this.activeOptions.set(lastBot.options);
        }
      }
    } catch {
      // ignore transient poll errors
    }
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      if (this.isOpen() && this.sessionId() && !this.isLoading()) {
        void this.refreshMessages();
      }
    }, 4000);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
