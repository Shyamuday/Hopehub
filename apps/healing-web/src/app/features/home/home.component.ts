import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FeedbackSectionComponent,
  GuidedSupportEntryComponent,
  OfferBannerCarouselComponent,
} from '../../shared/components';
import { APP_CONSTANTS } from '../../core';
import { CONSUMER_UX_COPY } from '../../core/constants/consumer-ux-copy.constants';
import { CONSUMER_ROUTES } from '../../core/constants/consumer-routes.constants';
import { CONSUMER_CONCERN_FLOWS } from '../../core/constants/consumer-concerns.constants';
import { IMAGE_ASSETS } from '../../core/constants/image-assets.constants';
import { environment } from '../../../environments/environment';
import { BookingService, ConsumerFlowsService, HopeHubProvider } from '../../core/services';
import { GroupChatTeaserComponent } from './components/group-chat-teaser/group-chat-teaser.component';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import { HomeToolsComponent } from './components/home-tools/home-tools.component';
import { LiveConnectComponent } from './components/live-connect/live-connect.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FeedbackSectionComponent,
    GroupChatTeaserComponent,
    GuidedSupportEntryComponent,
    HomeHeroComponent,
    HomeToolsComponent,
    LiveConnectComponent,
    OfferBannerCarouselComponent,
    RouterModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  readonly APP_CONSTANTS = APP_CONSTANTS;
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  private readonly bookingService = inject(BookingService);
  private readonly consumerFlowsService = inject(ConsumerFlowsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly psychologists = signal<HopeHubProvider[]>([]);
  readonly psychologistsLoading = signal(false);
  readonly supportMoments = [
    {
      image: IMAGE_ASSETS.HEALING_HUB.PHOTOS.WORK_STRESS,
      label: 'Work stress',
      title: 'When the day feels too loud',
      copy: 'Move from silent pressure to a private conversation with someone calm.',
      route: CONSUMER_CONCERN_FLOWS.stress.bookingLink,
      queryParams: CONSUMER_CONCERN_FLOWS.stress.bookingQueryParams,
    },
    {
      image: IMAGE_ASSETS.HEALING_HUB.PHOTOS.FEELING_WORDS,
      label: 'Self-check',
      title: 'Name what is happening inside',
      copy: 'Use tests and prompts to understand your mood before you explain it to anyone.',
      route: CONSUMER_CONCERN_FLOWS.general.assessment.link,
    },
    {
      image: IMAGE_ASSETS.HEALING_HUB.PHOTOS.COMMUNITY_SUPPORT,
      label: 'Community',
      title: 'Sit with people who get it',
      copy: 'Join low-pressure support spaces where venting can become lighter.',
      route: CONSUMER_ROUTES.links.telegram,
    },
    {
      image: IMAGE_ASSETS.HEALING_HUB.PHOTOS.HEARTBREAK_SUPPORT,
      label: 'Emotional pain',
      title: 'For heartbreak, guilt, anger, and overwhelm',
      copy: 'Start with support that does not judge your pace or your story.',
      route: CONSUMER_CONCERN_FLOWS.breakup.assessment.link,
    },
  ];
  readonly concernShortcuts = signal([
    CONSUMER_CONCERN_FLOWS.anxiety,
    CONSUMER_CONCERN_FLOWS.depression,
    CONSUMER_CONCERN_FLOWS.stress,
    CONSUMER_CONCERN_FLOWS.relationship,
    CONSUMER_CONCERN_FLOWS.sleep,
    CONSUMER_CONCERN_FLOWS.breakup,
  ]);

  ngOnInit(): void {
    this.consumerFlowsService.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        const flows = state.flows;
        this.concernShortcuts.set([
          flows.anxiety,
          flows.depression,
          flows.stress,
          flows.relationship,
          flows.sleep,
          flows.breakup,
        ]);
      });
    this.loadPsychologists();
  }

  providerImageUrl(provider: HopeHubProvider): string | null {
    if (!provider.profileImageUrl) {
      return null;
    }
    if (provider.profileImageUrl.startsWith('http')) {
      return provider.profileImageUrl;
    }
    return `${environment.apiUrl}${provider.profileImageUrl}`;
  }

  providerTierLabel(provider: HopeHubProvider): string {
    return provider.supportTierLabel ?? '';
  }

  providerRoleLabel(provider: HopeHubProvider): string {
    return provider.supportRoleLabel ?? '';
  }

  providerRoleBadgeClass(provider: HopeHubProvider): string {
    switch (provider.supportTierTone) {
      case 'professional':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
      case 'student':
        return 'bg-sky-50 text-sky-700 ring-sky-200';
      case 'volunteer':
        return 'bg-purple-50 text-purple-700 ring-purple-200';
      case 'coach':
      case 'mentor':
        return 'bg-amber-50 text-amber-800 ring-amber-200';
      case 'wellness':
        return 'bg-teal-50 text-teal-700 ring-teal-200';
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-200';
    }
  }

  private loadPsychologists(): void {
    this.psychologistsLoading.set(true);
    this.bookingService.featuredProviders().subscribe({
      next: (res) => {
        this.psychologists.set(res.providers);
        this.psychologistsLoading.set(false);
      },
      error: () => this.psychologistsLoading.set(false),
    });
  }
}
