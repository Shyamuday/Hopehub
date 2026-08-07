import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Socket } from 'socket.io-client';
import {
  AuthModalService,
  AuthService,
  BookingService,
  HopeHubRealtimeService,
  NotificationService,
} from '../../core/services';
import { User } from '../../core/models/auth.model';
import { HopeHubLiveGroup, HopeHubLiveGroupMessage } from '../../core/services/booking.service';

const GROUP_MESSAGE_EVENT = 'hopehub-group:message:new';

@Component({
  selector: 'app-live-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './live-groups.component.html',
  styleUrl: './live-groups.component.scss',
})
export class LiveGroupsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly notificationService = inject(NotificationService);
  private readonly realtime = inject(HopeHubRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = signal<User | null>(null);
  readonly group = signal<HopeHubLiveGroup | null>(null);
  readonly messages = signal<HopeHubLiveGroupMessage[]>([]);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly draft = signal('');
  readonly canSend = computed(
    () => !!this.currentUser() && !!this.draft().trim() && !this.sending(),
  );

  private groupId = '';
  private socket: Socket | null = null;

  private readonly handleIncomingMessage = (raw: unknown) => {
    const message = raw as HopeHubLiveGroupMessage;
    if (!message?.id || message.groupId !== this.group()?.id) return;
    this.mergeMessage(message);
  };

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.currentUser.set(user);
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.groupId = params.get('groupId') || '';
      if (this.groupId) this.loadGroup();
    });
  }

  ngOnDestroy(): void {
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
  }

  isOwnMessage(message: HopeHubLiveGroupMessage): boolean {
    return message.senderId === this.currentUser()?.id;
  }

  roleLabel(message: HopeHubLiveGroupMessage): string {
    const role = String(message.senderRole || '')
      .replace(/_/g, ' ')
      .toLowerCase();
    if (!role) return 'member';
    return role.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  signIn(): void {
    this.authModalService.openLogin();
  }

  sendMessage(): void {
    const body = this.draft().trim();
    if (!body || this.sending()) return;
    if (!this.currentUser()) {
      this.notificationService.info('Please sign in to join this group room.');
      this.authModalService.openLogin();
      return;
    }

    this.sending.set(true);
    this.bookingService.sendLiveGroupMessage(this.groupId, body).subscribe({
      next: (res) => {
        this.mergeMessage(res.message);
        this.draft.set('');
        this.sending.set(false);
      },
      error: (error) => {
        this.sending.set(false);
        const message = this.readErrorMessage(error);
        this.error.set(message);
        this.notificationService.error(message);
      },
    });
  }

  private loadGroup(): void {
    this.loading.set(true);
    this.error.set('');
    this.bookingService.liveGroup(this.groupId).subscribe({
      next: (res) => {
        this.group.set(res.group);
        this.messages.set(res.messages || []);
        this.loading.set(false);
        this.bindRealtime(res.group.id);
      },
      error: (error) => {
        this.loading.set(false);
        const message = this.readErrorMessage(error);
        this.error.set(message);
        if (!this.currentUser()) {
          this.authModalService.openLogin();
        }
      },
    });
  }

  private bindRealtime(groupId: string): void {
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.realtime.subscribeLiveGroup(groupId);
    this.socket = this.realtime.getSocket();
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.socket?.on?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
  }

  private mergeMessage(message: HopeHubLiveGroupMessage): void {
    this.messages.update((messages) => {
      if (messages.some((item) => item.id === message.id)) return messages;
      return [...messages, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }

  private readErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const inner = (error as { error?: { message?: string } }).error;
      if (inner?.message) return inner.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return 'Could not load this live group right now.';
  }
}
