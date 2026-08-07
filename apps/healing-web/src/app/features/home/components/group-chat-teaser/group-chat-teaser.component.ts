import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { filter, pairwise, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AuthModalService,
  AuthService,
  BookingService,
  GroupChatTeaserService,
  HopeHubRealtimeService,
} from '../../../../core/services';
import {
  HopeHubLiveGroup,
  HopeHubLiveGroupMessage,
} from '../../../../core/services/booking.service';
import type { Socket } from 'socket.io-client';

type TeaserMessage = {
  id?: string;
  author: string;
  role: string;
  body: string;
  tone: 'host' | 'member' | 'listener';
};

const GROUP_MESSAGE_EVENT = 'hopehub-group:message:new';

@Component({
  selector: 'app-group-chat-teaser',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './group-chat-teaser.component.html',
  styleUrl: './group-chat-teaser.component.scss',
})
export class GroupChatTeaserComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly bookingService = inject(BookingService);
  private readonly groupChatTeaser = inject(GroupChatTeaserService);
  private readonly realtime = inject(HopeHubRealtimeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isOpen = signal(false);
  readonly isMinimized = signal(false);
  readonly isAuthenticated = signal(false);
  readonly visibleMessageCount = signal(2);
  readonly draft = signal('');
  readonly sending = signal(false);
  readonly activeGroup = signal<HopeHubLiveGroup | null>(null);
  readonly realMessages = signal<TeaserMessage[]>([]);
  readonly hasRealChat = computed(() => this.realMessages().length > 0);
  readonly displayedMessages = computed(() =>
    this.hasRealChat() ? this.realMessages() : this.fallbackMessages,
  );
  readonly roomTitle = computed(() => this.activeGroup()?.title || 'Evening support room');
  readonly primaryActionLabel = computed(() => {
    if (!this.isAuthenticated()) return 'Sign up free to chat';
    return this.hasRealChat() ? 'Open group chat' : 'See live support';
  });

  readonly fallbackMessages: TeaserMessage[] = [
    {
      author: 'Asha',
      role: 'Host',
      body: 'Welcome in. You can just read quietly first — no pressure to explain everything.',
      tone: 'host',
    },
    {
      author: 'Riya',
      role: 'Member',
      body: 'I joined because evenings feel heavy sometimes. Reading others helped me feel less alone.',
      tone: 'member',
    },
    {
      author: 'Kabir',
      role: 'Emotional support listener',
      body: 'If you want to reply, create a free account so we can keep the room safe from spam.',
      tone: 'listener',
    },
    {
      author: 'Asha',
      role: 'Host',
      body: 'For private voice/video, use 1:1 Live Connect. This room is for gentle group chat.',
      tone: 'host',
    },
  ];

  private revealTimer: number | null = null;
  private openTimer: number | null = null;
  private socket: Socket | null = null;
  private subscribedGroupId = '';
  private readonly dismissedStorageKey = 'hopehub-group-chat-teaser-dismissed';
  private readonly pendingDraftStorageKey = 'hopehub-group-chat-teaser-pending-draft';

  private readonly handleIncomingMessage = (raw: unknown) => {
    const message = raw as HopeHubLiveGroupMessage;
    const group = this.activeGroup();
    if (!message?.id || !group || message.groupId !== group.id || message.isDeleted) return;

    this.realMessages.update((messages) => {
      if (messages.some((item) => item.id === message.id)) return messages;
      return [...messages, this.toTeaserMessage(message)].slice(-4);
    });
    this.visibleMessageCount.set(this.displayedMessages().length);
    if (!this.isOpen() || this.isMinimized()) {
      this.groupChatTeaser.incrementUnread();
    }
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadRealGroupPreview();

    this.authService.authState$
      .pipe(
        filter((state) => !state.isLoading),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        const isAuthenticated = state.isAuthenticated || Boolean(this.authService.getToken());
        this.isAuthenticated.set(isAuthenticated);
        if (isAuthenticated) {
          this.restorePendingDraft();
          this.bindRealtimeForActiveGroup();
          this.openTeaserAfterAuth();
        }
      });

    this.authModalService.modalState$
      .pipe(startWith(null), pairwise(), takeUntilDestroyed(this.destroyRef))
      .subscribe(([previous, current]) => {
        const authModalWasClosed = previous !== null && current === null;
        if (authModalWasClosed && !this.authService.getToken()) {
          this.openTeaserAfterAuth();
        }
      });

    this.groupChatTeaser.openRequested$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.groupChatTeaser.consumePendingOpen();
      this.openFromFloatingButton();
    });

    if (this.groupChatTeaser.consumePendingOpen()) {
      this.openFromFloatingButton();
    }

    this.destroyRef.onDestroy(() => {
      if (this.openTimer) window.clearTimeout(this.openTimer);
      if (this.revealTimer) window.clearInterval(this.revealTimer);
      this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    });
  }

  close(): void {
    this.isOpen.set(false);
    this.markDismissed();
    if (this.revealTimer) {
      window.clearInterval(this.revealTimer);
      this.revealTimer = null;
    }
  }

  minimize(): void {
    this.isMinimized.set(true);
  }

  restore(): void {
    this.isMinimized.set(false);
    this.isOpen.set(true);
    this.groupChatTeaser.clearUnread();
    this.startMessageReveal();
  }

  askToJoin(): void {
    if (this.isAuthenticated()) {
      const group = this.activeGroup();
      if (group) {
        void this.router.navigate(['/live-groups', group.slug || group.id]);
      } else {
        void this.router.navigate(['/'], { fragment: 'live-connect' });
      }
      return;
    }
    this.authModalService.openRegister();
  }

  sendPreviewReply(): void {
    if (!this.isAuthenticated()) {
      this.savePendingDraft();
      this.draft.set('');
      this.askToJoin();
      return;
    }

    if (!this.hasRealChat() || !this.activeGroup()) {
      this.draft.set('');
      this.askToJoin();
      return;
    }

    if (this.draft().trim() && !this.sending()) {
      const reply = this.draft().trim();
      const group = this.activeGroup();
      if (!group) return;
      this.sending.set(true);
      this.bookingService.sendLiveGroupMessage(group.slug || group.id, reply).subscribe({
        next: (res) => {
          this.realMessages.update((messages) => [
            ...messages,
            this.toTeaserMessage(res.message, true),
          ]);
          this.visibleMessageCount.set(this.displayedMessages().length);
          this.draft.set('');
          this.clearPendingDraft();
          this.sending.set(false);
        },
        error: () => {
          this.draft.set('');
          this.sending.set(false);
          this.askToJoin();
        },
      });
      return;
    }
  }

  private openTeaserAfterAuth(): void {
    if (this.wasDismissed() || this.isOpen()) return;
    if (this.openTimer) window.clearTimeout(this.openTimer);
    this.openTimer = window.setTimeout(() => {
      if (!this.authModalService.getCurrentModal() && !this.wasDismissed()) {
        this.isMinimized.set(false);
        this.isOpen.set(true);
        this.groupChatTeaser.clearUnread();
        this.startMessageReveal();
      }
    }, 500);
  }

  private openFromFloatingButton(): void {
    this.clearDismissed();
    this.isMinimized.set(false);
    this.isOpen.set(true);
    this.groupChatTeaser.clearUnread();
    this.startMessageReveal();
  }

  private startMessageReveal(): void {
    if (this.revealTimer) return;
    this.revealTimer = window.setInterval(() => {
      this.visibleMessageCount.update((count) => {
        if (count >= this.displayedMessages().length) {
          if (this.revealTimer) {
            window.clearInterval(this.revealTimer);
            this.revealTimer = null;
          }
          return count;
        }
        return count + 1;
      });
    }, 1800);
  }

  private wasDismissed(): boolean {
    try {
      return window.sessionStorage.getItem(this.dismissedStorageKey) === 'true';
    } catch {
      return false;
    }
  }

  private markDismissed(): void {
    try {
      window.sessionStorage.setItem(this.dismissedStorageKey, 'true');
    } catch {
      // Ignore storage failures.
    }
  }

  private clearDismissed(): void {
    try {
      window.sessionStorage.removeItem(this.dismissedStorageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  private savePendingDraft(): void {
    const value = this.draft().trim();
    if (!value) return;
    try {
      window.sessionStorage.setItem(this.pendingDraftStorageKey, value);
    } catch {
      // Ignore storage failures.
    }
  }

  private restorePendingDraft(): void {
    if (this.draft().trim()) return;
    try {
      const value = window.sessionStorage.getItem(this.pendingDraftStorageKey);
      if (value) this.draft.set(value);
    } catch {
      // Ignore storage failures.
    }
  }

  private clearPendingDraft(): void {
    try {
      window.sessionStorage.removeItem(this.pendingDraftStorageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  private loadRealGroupPreview(): void {
    this.bookingService
      .liveGroups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const activeGroup = (res.groups || []).find(
            (group) => Number(group.messageCount || 0) > 0,
          );
          if (!activeGroup) {
            this.activeGroup.set(null);
            this.realMessages.set([]);
            return;
          }

          this.bookingService
            .liveGroup(activeGroup.slug || activeGroup.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (groupRes) => {
                const realMessages = (groupRes.messages || [])
                  .filter((message) => !message.isDeleted && !!message.body?.trim())
                  .slice(-4)
                  .map((message) => this.toTeaserMessage(message));

                if (!realMessages.length) {
                  this.activeGroup.set(null);
                  this.realMessages.set([]);
                  return;
                }

                this.activeGroup.set(groupRes.group);
                this.realMessages.set(realMessages);
                this.visibleMessageCount.set(Math.min(2, realMessages.length));
                this.bindRealtimeForActiveGroup();
              },
              error: () => {
                this.activeGroup.set(null);
                this.realMessages.set([]);
              },
            });
        },
        error: () => {
          this.activeGroup.set(null);
          this.realMessages.set([]);
        },
      });
  }

  private toTeaserMessage(message: HopeHubLiveGroupMessage, own = false): TeaserMessage {
    const role = String(message.senderRole || '').toUpperCase();
    const isHost = role === 'ADMIN' || role === 'DOCTOR' || role === 'HR';
    return {
      id: message.id,
      author: own ? 'You' : message.senderName || 'Member',
      role: own ? 'Member' : this.roleLabel(role),
      body: message.body,
      tone: isHost ? 'host' : role.includes('VOLUNTEER') ? 'listener' : 'member',
    };
  }

  private roleLabel(role: string): string {
    if (role === 'DOCTOR') return 'Provider';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'HR') return 'Host';
    if (role.includes('VOLUNTEER')) return 'Emotional support listener';
    return 'Member';
  }

  private bindRealtimeForActiveGroup(): void {
    const group = this.activeGroup();
    if (!group || !this.isAuthenticated()) return;
    if (this.subscribedGroupId === group.id) return;

    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.realtime.subscribeLiveGroup(group.id);
    this.socket = this.realtime.getSocket();
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.socket?.on?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.subscribedGroupId = group.id;
  }
}
