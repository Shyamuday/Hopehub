import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeedbackSectionComponent, OfferBannerCarouselComponent } from '../../shared/components';
import { APP_CONSTANTS } from '../../core';
import { environment } from '../../../environments/environment';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FeedbackSectionComponent, HomeHeroComponent, OfferBannerCarouselComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  readonly APP_CONSTANTS = APP_CONSTANTS;
  private readonly bookingService = inject(BookingService);

  readonly psychologists = signal<HopeHubProvider[]>([]);
  readonly psychologistsLoading = signal(false);

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
    return provider.supportTierLabel || (provider.isClinicalCare ? 'Professional care' : 'Support');
  }

  providerRoleLabel(provider: HopeHubProvider): string {
    return provider.supportRoleLabel || 'Hope Hub care guide';
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
