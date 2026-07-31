import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-psychologist-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './psychologist-detail.component.html',
})
export class PsychologistDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly booking = inject(BookingService);
  private readonly notificationService = inject(NotificationService);

  readonly provider = signal<HopeHubProvider | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      const message = 'Provider not found.';
      this.error.set(message);
      this.notificationService.error(message);
      return;
    }
    this.loading.set(true);
    this.booking.provider(id).subscribe({
      next: ({ provider }) => {
        this.provider.set(provider);
        this.loading.set(false);
      },
      error: () => {
        const message = 'Could not load this profile.';
        this.error.set(message);
        this.notificationService.error(message);
        this.loading.set(false);
      },
    });
  }

  providerImageUrl(provider: HopeHubProvider): string | null {
    if (!provider.profileImageUrl) return null;
    return provider.profileImageUrl.startsWith('http')
      ? provider.profileImageUrl
      : `${environment.apiUrl}${provider.profileImageUrl}`;
  }

  book(provider: HopeHubProvider): void {
    this.router.navigate(['/contact'], {
      queryParams: {
        service: 'Mental wellness session',
        serviceName: 'Mental wellness session',
        consultant: provider.name,
        providerId: provider.id,
        duration: this.sessionLabel(provider),
        price: (provider.sessionFeeInPaise ?? 50000) / 100,
        source: 'psychologist-profile',
      },
    });
  }

  sessionLabel(provider: HopeHubProvider): string {
    const minutes = provider.sessionDurationMinutes ?? 30;
    return minutes === 30 ? '30 min + 15 min follow-up' : `${minutes} min session`;
  }

  listOrFallback(items: string[] | undefined, fallback: string[]) {
    return items?.length ? items : fallback;
  }
}
