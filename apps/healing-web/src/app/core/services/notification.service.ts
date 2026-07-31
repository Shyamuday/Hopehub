import { Injectable, signal } from '@angular/core';

export type NotificationTone = 'success' | 'error' | 'warning' | 'info';

export type AppNotification = {
  id: number;
  tone: NotificationTone;
  title: string;
  message?: string;
  durationMs: number;
};

export type NotificationOptions = {
  title?: string;
  message?: string;
  durationMs?: number;
};

const DEFAULT_DURATION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly items = signal<AppNotification[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly notifications = this.items.asReadonly();

  success(message: string, options: Omit<NotificationOptions, 'message'> = {}): number {
    return this.show('success', { ...options, message });
  }

  error(message: string, options: Omit<NotificationOptions, 'message'> = {}): number {
    return this.show('error', { ...options, message });
  }

  warning(message: string, options: Omit<NotificationOptions, 'message'> = {}): number {
    return this.show('warning', { ...options, message });
  }

  info(message: string, options: Omit<NotificationOptions, 'message'> = {}): number {
    return this.show('info', { ...options, message });
  }

  show(tone: NotificationTone, options: NotificationOptions): number {
    const id = this.nextId++;
    const notification: AppNotification = {
      id,
      tone,
      title: options.title || this.defaultTitle(tone),
      message: options.message,
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
    };

    this.items.update((items) => [notification, ...items].slice(0, 5));

    if (notification.durationMs > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), notification.durationMs),
      );
    }

    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.items.set([]);
  }

  private defaultTitle(tone: NotificationTone): string {
    switch (tone) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Something went wrong';
      case 'warning':
        return 'Please check';
      case 'info':
        return 'Update';
    }
  }
}
