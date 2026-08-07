import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { filter, pairwise, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthModalService, AuthService } from '../../../../core/services';

type TeaserMessage = {
  author: string;
  role: string;
  body: string;
  tone: 'host' | 'member' | 'listener';
};

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isOpen = signal(false);
  readonly isMinimized = signal(false);
  readonly isAuthenticated = signal(false);
  readonly visibleMessageCount = signal(2);
  readonly draft = signal('');

  readonly messages: TeaserMessage[] = [
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
  private readonly dismissedStorageKey = 'hopehub-group-chat-teaser-dismissed';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.authService.authState$
      .pipe(
        filter((state) => !state.isLoading),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        const isAuthenticated = state.isAuthenticated || Boolean(this.authService.getToken());
        this.isAuthenticated.set(isAuthenticated);
        if (isAuthenticated) {
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

    this.destroyRef.onDestroy(() => {
      if (this.openTimer) window.clearTimeout(this.openTimer);
      if (this.revealTimer) window.clearInterval(this.revealTimer);
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
  }

  askToJoin(): void {
    if (this.isAuthenticated()) {
      this.isMinimized.set(false);
      this.isOpen.set(true);
      return;
    }
    this.authModalService.openRegister();
  }

  sendPreviewReply(): void {
    if (this.isAuthenticated() && this.draft().trim()) {
      const reply = this.draft().trim();
      this.messages.push({
        author: 'You',
        role: 'Member',
        body: reply,
        tone: 'member',
      });
      this.visibleMessageCount.set(this.messages.length);
      this.draft.set('');
      return;
    }

    this.draft.set('');
    this.askToJoin();
  }

  private openTeaserAfterAuth(): void {
    if (this.wasDismissed() || this.isOpen()) return;
    if (this.openTimer) window.clearTimeout(this.openTimer);
    this.openTimer = window.setTimeout(() => {
      if (!this.authModalService.getCurrentModal() && !this.wasDismissed()) {
        this.isMinimized.set(false);
        this.isOpen.set(true);
        this.startMessageReveal();
      }
    }, 500);
  }

  private startMessageReveal(): void {
    if (this.revealTimer) return;
    this.revealTimer = window.setInterval(() => {
      this.visibleMessageCount.update((count) => {
        if (count >= this.messages.length) {
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
}
