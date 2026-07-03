import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import type { InAppNotificationItem, NotificationBellConfig } from './types';

@Component({
  selector: 'app-shared-notification-bell',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss'
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  @Input({ required: true }) config!: NotificationBellConfig;

  open = signal(false);
  loading = signal(false);
  unreadCount = signal(0);
  items = signal<InAppNotificationItem[]>([]);
  error = signal('');

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.refreshUnread();
    const pollMs = this.config.pollMs ?? 30000;
    this.pollTimer = setInterval(() => void this.refreshUnread(), pollMs);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) void this.loadItems();
  }

  close(): void {
    this.open.set(false);
  }

  private token(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.config.tokenKey);
  }

  private async apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.token();
    if (!token) throw new Error('Not signed in');
    const response = await fetch(`${this.config.apiBase}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {})
      }
    });
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return response.json() as Promise<T>;
  }

  async refreshUnread(): Promise<void> {
    try {
      const result = await this.apiFetch<{ count: number }>(`${this.config.apiPath}/unread-count`);
      this.unreadCount.set(result.count);
    } catch {
      // ignore when logged out
    }
  }

  async loadItems(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.apiFetch<{ notifications: InAppNotificationItem[] }>(
        `${this.config.apiPath}?page=1&pageSize=20`
      );
      this.items.set(result.notifications);
    } catch {
      this.error.set('Could not load notifications.');
    } finally {
      this.loading.set(false);
    }
  }

  async markRead(item: InAppNotificationItem): Promise<void> {
    if (item.readAt) return;
    try {
      await this.apiFetch(`${this.config.apiPath}/${item.id}/read`, { method: 'PATCH' });
      this.items.update((list: InAppNotificationItem[]) =>
        list.map((row: InAppNotificationItem) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row))
      );
      this.unreadCount.update((count: number) => Math.max(0, count - 1));
    } catch {
      this.error.set('Could not mark notification read.');
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await this.apiFetch(`${this.config.apiPath}/read-all`, { method: 'POST', body: '{}' });
      this.items.update((list: InAppNotificationItem[]) => list.map((row: InAppNotificationItem) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })));
      this.unreadCount.set(0);
    } catch {
      this.error.set('Could not mark all read.');
    }
  }
}
