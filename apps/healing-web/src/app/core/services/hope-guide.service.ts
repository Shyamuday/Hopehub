import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { CONSUMER_ROUTES } from '../constants/consumer-routes.constants';
import { CONSUMER_STORAGE_KEYS } from '../constants/storage-keys.constants';
import { ConsumerFlowPreferencesService } from './consumer-flow-preferences.service';

export type HopeGuideTip = {
  question: string;
  answer: string;
  actionLabel?: string;
  actionLink?: readonly string[];
  actionFragment?: string;
  actionQueryParams?: Record<string, string>;
};

@Injectable({ providedIn: 'root' })
export class HopeGuideService {
  private readonly storageKey = CONSUMER_STORAGE_KEYS.guideEnabled;
  private readonly router = inject(Router);
  private readonly preferences = inject(ConsumerFlowPreferencesService);

  readonly enabled = signal(this.readEnabled());
  readonly open = signal(false);
  readonly currentUrl = signal(this.router.url || '/');

  readonly tips = computed(() => this.tipsForUrl(this.currentUrl()));

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set((event as NavigationEnd).urlAfterRedirects || '/');
        this.open.set(false);
      });
  }

  toggleEnabled(): void {
    const next = !this.enabled();
    this.enabled.set(next);
    if (!next) this.open.set(false);
    this.saveEnabled(next);
  }

  setOpen(open: boolean): void {
    if (!this.enabled()) return;
    this.open.set(open);
  }

  toggleOpen(): void {
    if (!this.enabled()) return;
    this.open.set(!this.open());
  }

  private readEnabled(): boolean {
    if (typeof localStorage === 'undefined') return true;
    const value = localStorage.getItem(this.storageKey);
    return value === null ? true : value === 'true';
  }

  private saveEnabled(enabled: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, String(enabled));
  }

  private tipsForUrl(url: string): HopeGuideTip[] {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const saved = this.preferences.read();
    const concern = saved.concern || 'your concern';
    const modeLabel =
      saved.mode === 'chat'
        ? 'chat'
        : saved.mode === 'video'
          ? 'video call'
          : saved.mode === 'voice'
            ? 'voice call'
            : 'support';

    if (cleanUrl.startsWith('/assessments')) {
      return [
        {
          question: 'Is this test a diagnosis?',
          answer:
            'No. It is a private check-in to understand your current state, not a diagnosis or emergency service.',
        },
        {
          question: 'What happens after my result?',
          answer:
            'Choose one next step: talk now, book a slot, or see providers matched to your result.',
        },
        {
          question: 'Do I need to explain everything again?',
          answer: `No. If you choose ${modeLabel}, Hope Hub carries ${concern} into the next page.`,
        },
      ];
    }

    if (cleanUrl.startsWith('/care-team')) {
      return [
        {
          question: 'How do I choose the right person?',
          answer:
            'Start with the role: professional care, coaching, or emotional listening. Each supports a different kind of need.',
        },
        {
          question: 'Should I connect now or book later?',
          answer:
            'Use Live now for quick support. Choose the next slot when no one is available immediately.',
        },
        {
          question: 'Which filters should I use?',
          answer:
            'Start with concern and language. Add connection method or age group only if the list still feels too broad.',
        },
      ];
    }

    if (cleanUrl.startsWith('/services')) {
      return [
        {
          question: 'What should I choose first?',
          answer:
            'Choose the concern that feels closest. From there you can take a test, speak now, or book a session.',
        },
        {
          question: 'What if I cannot name what I feel?',
          answer:
            'Choose anxiety/stress or relationship as a starting point. The flow can still guide you well.',
        },
      ];
    }

    if (cleanUrl.startsWith('/contact')) {
      return [
        {
          question: 'Is booking private?',
          answer:
            'Yes. Your booking details stay private, and coupons and payments are checked securely before confirmation.',
        },
        {
          question: 'Can I use Hope Hub in an emergency?',
          answer:
            'No. If someone is unsafe right now, use local emergency help first. Hope Hub is for supportive care.',
        },
      ];
    }

    if (cleanUrl.startsWith('/live-session') || cleanUrl.startsWith('/live-groups')) {
      return [
        {
          question: 'Which connection mode should I choose?',
          answer:
            'Choose chat, voice, or video only when it feels comfortable. You can stop a session if it does not feel right.',
        },
        {
          question: 'Why do I need to sign up?',
          answer:
            'Guests can preview some spaces, but private participation needs a free account for safety and continuity.',
        },
      ];
    }

    return [
      {
        question: 'Where should I begin?',
        answer:
          'Pick your concern and preferred way to connect once. Hope Hub keeps that context as you move around.',
        actionLabel: 'Start guided support',
        actionLink: CONSUMER_ROUTES.links.home,
        actionFragment: CONSUMER_ROUTES.fragments.liveConnect,
      },
      {
        question: 'What if I need clarity first?',
        answer: 'Take a short private test when you are unsure what kind of support you need.',
        actionLabel: 'View tests',
        actionLink: CONSUMER_ROUTES.links.assessments,
      },
      {
        question: 'What if I want to talk to a person?',
        answer: `Use ${modeLabel} for ${concern}, or book a slot if no one is live.`,
        actionLabel: 'Meet care team',
        actionLink: CONSUMER_ROUTES.links.careTeam,
      },
    ];
  }
}
