import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';
import { PublicCommunicationConfigService } from '../../core/services/public-communication-config.service';

type CareTeamService = NonNullable<HopeHubProvider['services']>[number];

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
  readonly publicConfig = inject(PublicCommunicationConfigService);

  readonly provider = signal<HopeHubProvider | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly expandedBio = signal(false);
  readonly expandedApproach = signal(false);
  readonly expandedSections = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      const message = 'Care team profile not found.';
      this.error.set(message);
      this.notificationService.error(message);
      return;
    }
    this.loading.set(true);
    this.booking.provider(id).subscribe({
      next: ({ provider }) => {
        this.provider.set(provider);
        this.expandedBio.set(false);
        this.expandedApproach.set(false);
        this.expandedSections.set({});
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

  book(provider: HopeHubProvider, service?: CareTeamService): void {
    const selectedService = service || null;
    this.router.navigate(['/contact'], {
      queryParams: {
        service: selectedService?.title || this.publicConfig.defaultServiceName,
        serviceName: selectedService?.title || this.publicConfig.defaultServiceName,
        consultant: provider.name,
        providerId: provider.id,
        careTeamServiceId: selectedService?.id || '',
        duration: selectedService
          ? `${selectedService.durationMinutes} minutes`
          : this.sessionLabel(provider),
        price: selectedService
          ? selectedService.priceInPaise / 100
          : (provider.sessionFeeInPaise ?? this.publicConfig.defaultSessionPriceInPaise) / 100,
        source: selectedService ? 'care-team-service-profile' : 'care-team-profile',
      },
    });
  }

  sessionLabel(provider: HopeHubProvider): string {
    const minutes =
      provider.sessionDurationMinutes ?? this.publicConfig.defaultSessionDurationMinutes;
    return minutes === this.publicConfig.defaultSessionDurationMinutes
      ? this.publicConfig.defaultSessionLabel
      : `${minutes} min session`;
  }

  providerRoleLabel(provider: HopeHubProvider): string {
    return provider.supportRoleLabel || this.publicConfig.defaultCareRoleLabel;
  }

  providerRoleBadgeClass(provider: HopeHubProvider): string {
    switch (provider.supportRole) {
      case 'MENTAL_WELLNESS_PROFESSIONAL':
      case 'QUALIFIED_COUNSELLOR':
      case 'PSYCHOLOGIST':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
      case 'PSYCHOLOGY_STUDENT_VOLUNTEER':
      case 'STUDENT_VOLUNTEER':
        return 'bg-sky-50 text-sky-700 ring-sky-200';
      case 'PEER_SUPPORT_VOLUNTEER':
        return 'bg-purple-50 text-purple-700 ring-purple-200';
      case 'NLP_COACH':
      case 'LIFE_COACH':
      case 'CAREER_STUDY_MENTOR':
        return 'bg-amber-50 text-amber-800 ring-amber-200';
      case 'MEDITATION_BREATHWORK_GUIDE':
        return 'bg-teal-50 text-teal-700 ring-teal-200';
      default:
        return 'bg-amber-50 text-amber-800 ring-amber-200';
    }
  }

  servicePriceLabel(service: { priceInPaise: number; isFree: boolean }) {
    return service.isFree || service.priceInPaise === 0 ? 'Free' : `₹${service.priceInPaise / 100}`;
  }

  listOrFallback(items: string[] | undefined, fallback: string[]) {
    return items?.length ? items : fallback;
  }

  textIsLong(value: string | null | undefined): boolean {
    return (value?.trim().length ?? 0) > 360;
  }

  toggleBio(): void {
    this.expandedBio.update((value) => !value);
  }

  toggleApproach(): void {
    this.expandedApproach.update((value) => !value);
  }

  visibleItems(key: string, items: string[] | undefined, fallback: string[], limit = 6): string[] {
    const list = this.listOrFallback(items, fallback);
    return this.expandedSections()[key] ? list : list.slice(0, limit);
  }

  hiddenItemCount(key: string, items: string[] | undefined, fallback: string[], limit = 6): number {
    const list = this.listOrFallback(items, fallback);
    return this.expandedSections()[key] ? 0 : Math.max(0, list.length - limit);
  }

  toggleSection(key: string): void {
    this.expandedSections.update((sections) => ({
      ...sections,
      [key]: !sections[key],
    }));
  }
}
