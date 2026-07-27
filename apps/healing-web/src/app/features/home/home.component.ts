import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeedbackSectionComponent } from '../../shared/components';
import { APP_CONSTANTS } from '../../core';
import { environment } from '../../../environments/environment';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FeedbackSectionComponent, HomeHeroComponent, RouterLink],
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

  private loadPsychologists(): void {
    this.psychologistsLoading.set(true);
    this.bookingService.providers({ page: 1, pageSize: 5 }).subscribe({
      next: (res) => {
        this.psychologists.set(res.providers);
        this.psychologistsLoading.set(false);
      },
      error: () => this.psychologistsLoading.set(false),
    });
  }
}
