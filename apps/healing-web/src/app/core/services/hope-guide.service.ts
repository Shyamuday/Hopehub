import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { CONSUMER_ROUTES } from '../constants/consumer-routes.constants';
import { ConsumerFlowPreferencesService } from './consumer-flow-preferences.service';

export type HopeGuideTip = {
  title: string;
  body: string;
  actionLabel?: string;
  actionLink?: readonly string[];
  actionFragment?: string;
  actionQueryParams?: Record<string, string>;
};

@Injectable({ providedIn: 'root' })
export class HopeGuideService {
  private readonly storageKey = 'hopehub_guide_enabled';
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
          title: 'Tests are only a guide',
          body: 'Use the result to understand your current state. It is not a diagnosis or emergency service.',
        },
        {
          title: 'After the result',
          body: 'Choose one next step: talk now, book a slot, or see providers matched to the result.',
        },
        {
          title: 'Carry this context',
          body: `If you choose ${modeLabel}, Hope Hub will carry ${concern} into the next page.`,
        },
      ];
    }

    if (cleanUrl.startsWith('/care-team')) {
      return [
        {
          title: 'Choose by role first',
          body: 'Professional care, coaching, and emotional listening have different scopes. Pick the role that fits the need.',
        },
        {
          title: 'Check availability',
          body: 'Live now is best for quick support. Next slot is better when no one is available immediately.',
        },
        {
          title: 'Use filters gently',
          body: 'Start with concern and language. Add method or age group only if the list is still too broad.',
        },
      ];
    }

    if (cleanUrl.startsWith('/services')) {
      return [
        {
          title: 'Start with the need',
          body: 'Choose the closest concern first. You can take a test, speak now, or book from the service page.',
        },
        {
          title: 'No need to know exact words',
          body: 'If you are unsure, pick anxiety/stress or relationship. The flow can still route you correctly.',
        },
      ];
    }

    if (cleanUrl.startsWith('/contact')) {
      return [
        {
          title: 'Private checkout',
          body: 'Your booking details stay private. Coupon and payment are checked securely before confirmation.',
        },
        {
          title: 'Not emergency care',
          body: 'If someone is unsafe right now, use local emergency help first. Hope Hub is for supportive care.',
        },
      ];
    }

    if (cleanUrl.startsWith('/live-session') || cleanUrl.startsWith('/live-groups')) {
      return [
        {
          title: 'Connect safely',
          body: 'Use chat, voice, or video only when you feel ready. You can stop the session if it does not feel right.',
        },
        {
          title: 'Signup may be needed',
          body: 'Guests can preview some spaces, but speaking privately needs a free account for safety and continuity.',
        },
      ];
    }

    return [
      {
        title: 'Not sure where to begin?',
        body: 'Pick your concern and preferred mode once. Hope Hub will keep that context while you move around.',
        actionLabel: 'Start guided support',
        actionLink: CONSUMER_ROUTES.links.home,
        actionFragment: CONSUMER_ROUTES.fragments.liveConnect,
      },
      {
        title: 'Want clarity first?',
        body: 'Take a short test if you are unsure what kind of support you need.',
        actionLabel: 'View tests',
        actionLink: CONSUMER_ROUTES.links.assessments,
      },
      {
        title: 'Want a person?',
        body: `Use ${modeLabel} for ${concern}, or book a slot if no one is live.`,
        actionLabel: 'Meet care team',
        actionLink: CONSUMER_ROUTES.links.careTeam,
      },
    ];
  }
}
