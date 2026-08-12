import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
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
import {
  HopeHubLiveGroup,
  HopeHubLiveGroupMessage,
  HopeHubLiveGroupModeration,
} from '../../core/services/booking.service';
import { AppButtonComponent } from '../../shared/components';

const GROUP_MESSAGE_EVENT = 'hopehub-group:message:new';
const GROUP_TYPING_EVENT = 'hopehub-group:typing';

@Component({
  selector: 'app-live-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AppButtonComponent],
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
  readonly requiresLoginToSpeak = signal(false);
  readonly moderation = signal<HopeHubLiveGroupModeration | null>(null);
  readonly shareMessage = signal('');
  readonly roomSettingsOpen = signal(false);
  readonly savingRoomSettings = signal(false);
  readonly settingsTitle = signal('');
  readonly settingsDescription = signal('');
  readonly settingsCallTitle = signal('');
  readonly settingsCallAgenda = signal('');
  readonly settingsPinnedMessage = signal('');
  readonly settingsRoomRules = signal('');
  readonly settingsSlowModeSeconds = signal(0);
  readonly reportingMessageId = signal('');
  readonly typingUsers = signal<string[]>([]);
  readonly canSend = computed(
    () => !!this.currentUser() && !!this.draft().trim() && !this.sending(),
  );

  private groupId = '';
  private socket: Socket | null = null;
  private typingStopTimer: ReturnType<typeof setTimeout> | null = null;
  private typingClearTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly handleIncomingMessage = (raw: unknown) => {
    const message = raw as HopeHubLiveGroupMessage;
    if (!message?.id || message.groupId !== this.group()?.id) return;
    this.mergeMessage(message);
  };

  private readonly handleTyping = (raw: unknown) => {
    const event = raw as {
      groupId?: string;
      userId?: string;
      displayName?: string;
      isTyping?: boolean;
    };
    if (!event?.groupId || event.groupId !== this.group()?.id) return;
    if (!event.userId || event.userId === this.currentUser()?.id) return;

    const name = (event.displayName || 'Someone').trim();
    const existingTimer = this.typingClearTimers.get(event.userId);
    if (existingTimer) clearTimeout(existingTimer);

    if (!event.isTyping) {
      this.removeTypingUser(name);
      this.typingClearTimers.delete(event.userId);
      return;
    }

    this.typingUsers.update((users) => (users.includes(name) ? users : [...users, name]));
    const timer = setTimeout(() => {
      this.removeTypingUser(name);
      this.typingClearTimers.delete(event.userId || '');
    }, 3500);
    this.typingClearTimers.set(event.userId, timer);
  };

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      const wasAnonymousPreview = !this.currentUser() && !!user && this.requiresLoginToSpeak();
      this.currentUser.set(user);
      if (wasAnonymousPreview && this.groupId) {
        this.loadGroup();
      }
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.groupId = params.get('groupId') || '';
      if (this.groupId) this.loadGroup();
    });
  }

  ngOnDestroy(): void {
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.socket?.off?.(GROUP_TYPING_EVENT, this.handleTyping);
    if (this.typingStopTimer) clearTimeout(this.typingStopTimer);
    this.typingClearTimers.forEach((timer) => clearTimeout(timer));
    this.emitTyping(false);
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

  canHostGroups(): boolean {
    const role = this.currentUser()?.role;
    return role === 'DOCTOR' || role === 'ADMIN' || role === 'HR';
  }

  groupModeLabel(): string {
    return 'Open chat';
  }

  senderInitials(message: HopeHubLiveGroupMessage): string {
    return (message.senderName || 'M')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  }

  messageTime(message: HopeHubLiveGroupMessage): string {
    const date = new Date(message.createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  typingLabel(): string {
    const users = this.typingUsers();
    if (!users.length) return '';
    if (users.length === 1) return `${users[0]} is typing`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing`;
    return 'Several members are typing';
  }

  signUpForFreeChat(): void {
    this.notificationService.info(
      'Create a free account to chat in the group or start a free consultation chat.',
    );
    this.authModalService.openRegister();
  }

  async shareRoom(): Promise<void> {
    const room = this.group();
    const url = typeof window === 'undefined' ? '' : window.location.href;
    const title = room?.callTitle || room?.title || 'Hope Hub support chat';
    const browserNavigator: any = typeof window === 'undefined' ? null : window.navigator;
    try {
      if (browserNavigator && 'share' in browserNavigator) {
        await browserNavigator.share({ title, text: 'Join this Hope Hub support chat.', url });
      } else if (browserNavigator?.clipboard && url) {
        await browserNavigator.clipboard.writeText(url);
        this.shareMessage.set('Room link copied.');
      }
    } catch {
      this.shareMessage.set('');
    }
  }

  openRoomSettings(): void {
    const room = this.group();
    if (!room) return;
    this.settingsTitle.set(room.title || '');
    this.settingsDescription.set(room.description || '');
    this.settingsCallTitle.set(room.callTitle || room.title || '');
    this.settingsCallAgenda.set(room.callAgenda || '');
    this.settingsPinnedMessage.set(room.pinnedMessage || '');
    this.settingsRoomRules.set(room.roomRules || '');
    this.settingsSlowModeSeconds.set(Number(room.slowModeSeconds || 0));
    this.roomSettingsOpen.set(true);
  }

  saveRoomSettings(): void {
    if (!this.canHostGroups() || this.savingRoomSettings()) return;
    this.savingRoomSettings.set(true);
    this.bookingService
      .updateLiveGroupDetails(this.groupId, {
        title: this.settingsTitle().trim(),
        description: this.settingsDescription().trim(),
        callTitle: this.settingsCallTitle().trim(),
        callAgenda: this.settingsCallAgenda().trim(),
        pinnedMessage: this.settingsPinnedMessage().trim(),
        roomRules: this.settingsRoomRules().trim(),
        slowModeSeconds: Number(this.settingsSlowModeSeconds() || 0),
      })
      .subscribe({
        next: (res) => {
          this.group.set(res.group);
          this.savingRoomSettings.set(false);
          this.roomSettingsOpen.set(false);
          this.notificationService.success('Room settings updated.');
        },
        error: (error) => {
          this.savingRoomSettings.set(false);
          this.notificationService.error(this.readErrorMessage(error));
        },
      });
  }

  sendMessage(): void {
    const body = this.draft().trim();
    if (!body || this.sending()) return;
    if (!this.currentUser()) {
      this.signUpForFreeChat();
      return;
    }

    this.sending.set(true);
    this.emitTyping(false);
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

  onDraftChange(value: string): void {
    this.draft.set(value);
    if (!this.currentUser() || !this.group()?.id) return;

    const isTyping = Boolean(value.trim());
    this.emitTyping(isTyping);
    if (this.typingStopTimer) clearTimeout(this.typingStopTimer);
    if (isTyping) {
      this.typingStopTimer = setTimeout(() => this.emitTyping(false), 1600);
    }
  }

  private loadGroup(): void {
    this.loading.set(true);
    this.error.set('');
    this.bookingService.liveGroup(this.groupId).subscribe({
      next: (res) => {
        this.group.set(res.group);
        this.requiresLoginToSpeak.set(Boolean(res.requiresLoginToSpeak));
        this.moderation.set(res.moderation || null);
        this.messages.set(res.messages || []);
        this.loading.set(false);
        this.bindRealtime(res.group.id);
      },
      error: (error) => {
        this.loading.set(false);
        const message = this.readErrorMessage(error);
        this.error.set(message);
      },
    });
  }

  private bindRealtime(groupId: string): void {
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    if (!this.currentUser()) return;
    this.realtime.subscribeLiveGroup(groupId);
    this.socket = this.realtime.getSocket();
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.socket?.on?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.socket?.off?.(GROUP_TYPING_EVENT, this.handleTyping);
    this.socket?.on?.(GROUP_TYPING_EVENT, this.handleTyping);
  }

  moderateMessageSender(
    message: HopeHubLiveGroupMessage,
    action: 'MUTE' | 'BAN' | 'REMOVE' | 'UNMUTE' | 'UNBAN',
  ): void {
    if (!this.canModerateMessage(message)) return;
    this.bookingService
      .moderateLiveGroupMember(this.groupId, {
        userId: message.senderId,
        displayName: message.senderName,
        role: message.senderRole || '',
        action,
        mutedMinutes: action === 'MUTE' ? 60 : undefined,
        reason: `Moderated from Hope Hub support chat by ${this.currentUser()?.name || 'moderator'}`,
      })
      .subscribe({
        next: () => this.notificationService.success(`Member ${action.toLowerCase()} applied.`),
        error: (error) => this.notificationService.error(this.readErrorMessage(error)),
      });
  }

  removeMessage(message: HopeHubLiveGroupMessage): void {
    if (!this.canHostGroups() || message.isDeleted) return;
    this.bookingService.removeLiveGroupMessage(this.groupId, message.id).subscribe({
      next: (res) => this.mergeMessage(res.message, true),
      error: (error) => this.notificationService.error(this.readErrorMessage(error)),
    });
  }

  reportMessage(message: HopeHubLiveGroupMessage): void {
    if (!this.currentUser()) {
      this.signUpForFreeChat();
      return;
    }
    if (!this.canReportMessage(message) || this.reportingMessageId()) return;

    this.reportingMessageId.set(message.id);
    this.bookingService
      .reportLiveGroupMessage(this.groupId, {
        messageId: message.id,
        targetUserId: message.senderId,
        targetDisplayName: message.senderName,
        reason: 'Concern or unsafe message',
        details: 'Reported from Hope Hub support chat.',
      })
      .subscribe({
        next: () => {
          this.reportingMessageId.set('');
          this.notificationService.success('Thanks. This message was reported for review.');
        },
        error: (error) => {
          this.reportingMessageId.set('');
          this.notificationService.error(this.readErrorMessage(error));
        },
      });
  }

  canModerateMessage(message: HopeHubLiveGroupMessage): boolean {
    return (
      this.canHostGroups() && message.senderId !== this.currentUser()?.id && !message.isDeleted
    );
  }

  canReportMessage(message: HopeHubLiveGroupMessage): boolean {
    return (
      !!this.currentUser() && message.senderId !== this.currentUser()?.id && !message.isDeleted
    );
  }

  private mergeMessage(message: HopeHubLiveGroupMessage, replace = false): void {
    this.messages.update((messages) => {
      if (replace) {
        return messages.map((item) => (item.id === message.id ? message : item));
      }
      if (messages.some((item) => item.id === message.id)) return messages;
      return [...messages, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }

  private emitTyping(isTyping: boolean): void {
    const room = this.group();
    const user = this.currentUser();
    if (!room?.id || !user) return;
    this.realtime.sendLiveGroupTyping(room.id, user.name || 'Member', isTyping);
  }

  private removeTypingUser(name: string): void {
    this.typingUsers.update((users) => users.filter((user) => user !== name));
  }

  private readErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const inner = (error as { error?: { code?: string; message?: string } }).error;
      if (inner?.message) return inner.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return 'Could not load this live group right now.';
  }
}
