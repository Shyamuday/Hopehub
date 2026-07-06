import { Injectable, signal } from '@angular/core';
import { ClinicApiClient } from '../../clinic-api/clinic-api.client';
import { API_PATHS } from '../constants/api-paths.constants';

export interface ChatMsg {
  id: string;
  role: 'bot' | 'user' | 'operator';
  content: string;
  createdAt: string;
  showBookButton?: boolean;
  showWhatsAppButton?: boolean;
}

const SESSION_KEY = 'vitalis_chat_session_id';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private api = new ClinicApiClient();

  readonly messages    = signal<ChatMsg[]>([]);
  readonly isOpen      = signal(false);
  readonly isLoading   = signal(false);
  readonly sessionId   = signal<string | null>(null);
  readonly botName     = signal('Dr. Priya');

  constructor() {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) this.loadSession(saved);
  }

  toggle() {
    this.isOpen.update(v => !v);
    if (this.isOpen() && !this.sessionId()) this.startSession();
  }

  open() {
    this.isOpen.set(true);
    if (!this.sessionId()) this.startSession();
  }

  close() { this.isOpen.set(false); }

  async startSession(userId?: string) {
    this.isLoading.set(true);
    try {
      const res = await this.api.apiFetch<{
        sessionId: string; messages: ChatMsg[]; botName: string;
      }>(API_PATHS.CHAT.START, {
        method: 'POST',
        body: JSON.stringify({ userId: userId ?? null })
      });
      this.sessionId.set(res.sessionId);
      this.botName.set(res.botName);
      this.messages.set(res.messages);
      localStorage.setItem(SESSION_KEY, res.sessionId);
    } finally {
      this.isLoading.set(false);
    }
  }

  async sendMessage(content: string) {
    const sid = this.sessionId();
    if (!sid) return;

    // Optimistically add user message
    const tempId = 'tmp_' + Date.now();
    this.messages.update(msgs => [
      ...msgs,
      { id: tempId, role: 'user', content, createdAt: new Date().toISOString() }
    ]);

    this.isLoading.set(true);
    try {
      const res = await this.api.apiFetch<{
        userMessage: ChatMsg; botMessage: ChatMsg;
      }>(API_PATHS.CHAT.MESSAGE(sid), {
        method: 'POST',
        body: JSON.stringify({ content })
      });

      // Replace temp user message with real one, then add bot reply
      this.messages.update(msgs =>
        [...msgs.filter(m => m.id !== tempId), res.userMessage, res.botMessage]
      );
    } catch {
      this.messages.update(msgs => msgs.filter(m => m.id !== tempId));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadSession(id: string) {
    try {
      const res = await this.api.apiFetch<{ messages: ChatMsg[] }>(
        API_PATHS.CHAT.SESSION(id)
      );
      this.sessionId.set(id);
      this.messages.set(res.messages);
    } catch {
      // Session expired or invalid — start fresh
      localStorage.removeItem(SESSION_KEY);
    }
  }

  resetSession() {
    localStorage.removeItem(SESSION_KEY);
    this.sessionId.set(null);
    this.messages.set([]);
    this.startSession();
  }
}
