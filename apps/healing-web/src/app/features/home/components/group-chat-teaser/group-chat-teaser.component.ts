import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  ElementRef,
  effect,
  ViewChild,
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
  ViewportOverlayService,
} from '../../../../core/services';
import { CONSUMER_ROUTES } from '../../../../core/constants/consumer-routes.constants';
import { APP_CONSTANTS } from '../../../../core/constants/app.constants';
import { CONSUMER_STORAGE_KEYS } from '../../../../core/constants/storage-keys.constants';
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
  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly bookingService = inject(BookingService);
  private readonly groupChatTeaser = inject(GroupChatTeaserService);
  private readonly realtime = inject(HopeHubRealtimeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlay = inject(ViewportOverlayService);
  private readonly overlayOwner = 'group-chat';
  readonly ROUTES = CONSUMER_ROUTES;
  readonly APP_CONSTANTS = APP_CONSTANTS;

  readonly isOpen = signal(false);
  readonly isMinimized = signal(false);
  readonly isAuthenticated = signal(false);
  readonly draft = signal('');
  readonly sending = signal(false);
  readonly loadingGroup = signal(true);
  readonly activeGroup = signal<HopeHubLiveGroup | null>(null);
  readonly realMessages = signal<TeaserMessage[]>([]);
  readonly hasRealChat = computed(() => Boolean(this.activeGroup()));
  readonly displayedMessages = computed(() => this.realMessages());
  readonly roomTitle = computed(() => this.activeGroup()?.title || 'Live user chat');
  readonly teaserLabel = computed(() =>
    this.hasRealChat() ? 'Live user chat' : 'Community chat preview',
  );
  readonly primaryActionLabel = computed(() => {
    if (!this.isAuthenticated()) return 'Sign up free to chat';
    return this.hasRealChat() ? 'Continue in chat' : 'See live support';
  });

  private openTimer: number | null = null;
  private refreshTimer: number | null = null;
  private socket: Socket | null = null;
  private subscribedGroupId = '';
  private readonly dismissedStorageKey = CONSUMER_STORAGE_KEYS.groupChatTeaserDismissed;
  private readonly pendingDraftStorageKey = CONSUMER_STORAGE_KEYS.groupChatTeaserPendingDraft;

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (this.isOpen() && !this.isMinimized()) this.overlay.acquire(this.overlayOwner);
      else this.overlay.release(this.overlayOwner);
    });

    this.destroyRef.onDestroy(() => {
      this.overlay.release(this.overlayOwner);
    });
  }

  private readonly handleIncomingMessage = (raw: unknown) => {
    const message = raw as HopeHubLiveGroupMessage;
    const group = this.activeGroup();
    if (!message?.id || !group || message.groupId !== group.id || message.isDeleted) return;

    this.realMessages.update((messages) => {
      if (messages.some((item) => item.id === message.id)) return messages;
      return [...messages, this.toTeaserMessage(message)].slice(-100);
    });
    this.scrollToLatest();
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
          this.realtime.connect();
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
      if (this.refreshTimer) window.clearInterval(this.refreshTimer);
      this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
      this.realtime.unsubscribeLiveGroup(this.subscribedGroupId);
    });
  }

  close(): void {
    this.isOpen.set(false);
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.markDismissed();
  }

  minimize(): void {
    this.isMinimized.set(true);
  }

  restore(): void {
    this.isMinimized.set(false);
    this.isOpen.set(true);
    this.groupChatTeaser.clearUnread();
    this.scrollToLatest();
  }

  askToJoin(): void {
    if (this.isAuthenticated()) {
      const group = this.activeGroup();
      if (group) {
        // The floating chat is the conversation surface. Do not send someone
        // who has just signed up to a second route that may be unavailable
        // while the Telegram bridge is reconnecting.
        this.isMinimized.set(false);
        this.isOpen.set(true);
        this.groupChatTeaser.clearUnread();
        this.scrollToLatest();
        this.focusComposer();
      } else {
        void this.router.navigate(CONSUMER_ROUTES.links.home, {
          fragment: CONSUMER_ROUTES.fragments.liveConnect,
        });
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
          this.realMessages.update((messages) =>
            [...messages, this.toTeaserMessage(res.message, true)].slice(-100),
          );
          this.draft.set('');
          this.clearPendingDraft();
          this.sending.set(false);
          this.scrollToLatest();
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
        this.startPreviewRefresh();
        this.groupChatTeaser.clearUnread();
        this.scrollToLatest();
      }
    }, 500);
  }

  private openFromFloatingButton(): void {
    this.clearDismissed();
    this.isMinimized.set(false);
    this.isOpen.set(true);
    this.groupChatTeaser.clearUnread();
    // Re-fetch on every open. This makes the floating button recover cleanly
    // after a slow initial request and ensures a returning visitor sees the
    // newest Telegram messages before the socket has connected.
    this.loadRealGroupPreview();
    this.startPreviewRefresh();
    this.scrollToLatest();
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
    this.loadingGroup.set(true);
    this.bookingService
      .liveGroups()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const groups = res.groups || [];
          const activeGroup =
            groups.find((group) => group.slug === 'telegram-community') ||
            groups.find((group) => Number(group.messageCount || 0) > 0) ||
            groups[0];
          if (!activeGroup) {
            this.activeGroup.set(null);
            this.realMessages.set([]);
            this.loadingGroup.set(false);
            return;
          }

          this.bookingService
            .liveGroup(activeGroup.slug || activeGroup.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (groupRes) => {
                const realMessages = (groupRes.messages || [])
                  .filter((message) => !message.isDeleted && !!message.body?.trim())
                  .slice(-100)
                  .map((message) => this.toTeaserMessage(message));

                this.activeGroup.set(groupRes.group);
                this.realMessages.set(realMessages);
                this.bindRealtimeForActiveGroup();
                this.loadingGroup.set(false);
                this.scrollToLatest();
              },
              error: () => {
                this.activeGroup.set(null);
                this.realMessages.set([]);
                this.loadingGroup.set(false);
              },
            });
        },
        error: () => {
          this.activeGroup.set(null);
          this.realMessages.set([]);
          this.loadingGroup.set(false);
        },
      });
  }

  private startPreviewRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = window.setInterval(() => {
      if (this.isOpen() && !this.isMinimized()) this.loadRealGroupPreview();
    }, 30_000);
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
    if (role === 'TELEGRAM_MEMBER') return 'Telegram member';
    if (role === 'DOCTOR') return 'Provider';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'HR') return 'Host';
    if (role.includes('VOLUNTEER')) return 'Emotional support listener';
    return 'Member';
  }

  private bindRealtimeForActiveGroup(): void {
    const group = this.activeGroup();
    if (!group) return;
    if (this.subscribedGroupId === group.id) return;

    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.realtime.subscribeLiveGroup(group.id);
    this.socket = this.realtime.getSocket();
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.socket?.on?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.subscribedGroupId = group.id;
  }

  private scrollToLatest(): void {
    window.setTimeout(() => {
      const element = this.messageList?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }

  private focusComposer(): void {
    window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[name="teaserReply"]');
      input?.focus();
    });
  }
}
