import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FeedbackSectionComponent, OfferBannerCarouselComponent } from '../../shared/components';
import { APP_CONSTANTS } from '../../core';
import { CONSUMER_UX_COPY } from '../../core/constants/consumer-ux-copy.constants';
import { IMAGE_ASSETS } from '../../core/constants/image-assets.constants';
import { environment } from '../../../environments/environment';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';
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
  private readonly bookingService = inject(BookingService);

  readonly psychologists = signal<HopeHubProvider[]>([]);
  readonly psychologistsLoading = signal(false);
  readonly supportMoments = [
    {
      image: IMAGE_ASSETS.HEALING_HUB.PHOTOS.WORK_STRESS,
      label: 'Work stress',
      title: 'When the day feels too loud',
      copy: 'Move from silent pressure to a private conversation with someone calm.',
      route: '/contact',
    },
    {
      image: IMAGE_ASSETS.HEALING_HUB.PHOTOS.FEELING_WORDS,
      label: 'Self-check',
      title: 'Name what is happening inside',
      copy: 'Use tests and prompts to understand your mood before you explain it to anyone.',
      route: '/assessments',
    },
    {
      image: IMAGE_ASSETS.HEALING_HUB.PHOTOS.COMMUNITY_SUPPORT,
      label: 'Community',
      title: 'Sit with people who get it',
      copy: 'Join low-pressure support spaces where venting can become lighter.',
      route: '/telegram',
    },
    {
      image: IMAGE_ASSETS.HEALING_HUB.PHOTOS.HEARTBREAK_SUPPORT,
      label: 'Emotional pain',
      title: 'For heartbreak, guilt, anger, and overwhelm',
      copy: 'Start with support that does not judge your pace or your story.',
      route: '/articles',
    },
  ];

  ngOnInit(): void {
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
