import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';
import { PublicCommunicationConfigService } from '../../core/services/public-communication-config.service';

type CareTeamListService = NonNullable<HopeHubProvider['services']>[number];
type RoleGroup =
  '' | 'PROFESSIONALS' | 'COUNSELLORS' | 'VOLUNTEERS' | 'COACHES' | 'WELLNESS_GUIDES' | 'MENTORS';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-psychologists',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './psychologists.component.html',
})
export class PsychologistsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  readonly publicConfig = inject(PublicCommunicationConfigService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly providers = signal<HopeHubProvider[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly q = signal('');
  readonly concern = signal('');
  readonly language = signal('');
  readonly modality = signal('');
  readonly sessionType = signal('');
  readonly ageGroup = signal('');
  readonly roleGroup = signal<RoleGroup>('');
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly roleCounts = signal<Record<RoleGroup, number>>({
    '': 0,
    PROFESSIONALS: 0,
    COUNSELLORS: 0,
    VOLUNTEERS: 0,
    COACHES: 0,
    WELLNESS_GUIDES: 0,
    MENTORS: 0,
  });
  readonly concernOptions = ['', 'Anxiety', 'Stress', 'Relationship concerns', 'Family concerns'];
  readonly languageOptions = ['', 'English', 'Hindi', 'Bengali', 'Tamil', 'Telugu'];
  readonly modalityOptions = [
    '',
    'CBT',
    'Supportive counselling',
    'Mindfulness',
    'Family counselling',
  ];
  readonly sessionTypeOptions = [
    '',
    'Individual session',
    'Relationship support',
    'Family support',
  ];
  readonly ageGroupOptions = ['', 'Adults', 'Teens', 'Children', 'Older adults'];
  readonly roleTabs: Array<{ value: RoleGroup; label: string; help: string }> = [
    { value: '', label: 'All', help: 'Show every published support option' },
    { value: 'PROFESSIONALS', label: 'Professionals', help: 'Structured mental-wellness care' },
    { value: 'COUNSELLORS', label: 'Counsellors', help: 'Guided counselling support' },
    { value: 'VOLUNTEERS', label: 'Volunteers', help: 'Non-clinical listening support' },
    { value: 'COACHES', label: 'Coaches', help: 'Goals, habits, confidence' },
    { value: 'WELLNESS_GUIDES', label: 'Wellness guides', help: 'Breathing and mindfulness' },
    { value: 'MENTORS', label: 'Mentors', help: 'Study and career support' },
  ];

  ngOnInit(): void {
    this.hydrateFiltersFromUrl();
    this.load();
    this.loadRoleCounts();
  }

  load(options: { syncUrl?: boolean; refreshCounts?: boolean } = {}): void {
    if (options.syncUrl !== false) this.syncUrl();
    this.loading.set(true);
    this.error.set('');
    this.bookingService
      .providers({
        page: this.page(),
        pageSize: this.pageSize,
        q: this.q(),
        roleGroup: this.roleGroup(),
        concern: this.concern(),
        language: this.language(),
        modality: this.modality(),
        sessionType: this.sessionType(),
        ageGroup: this.ageGroup(),
      })
      .subscribe({
        next: (res) => {
          this.providers.set(this.sortedProviders(res.providers));
          this.total.set(res.pagination.total);
          this.totalPages.set(res.pagination.totalPages);
          this.loading.set(false);
          if (options.refreshCounts) this.loadRoleCounts();
        },
        error: () => {
          const message = 'Could not load the care team right now.';
          this.error.set(message);
          this.notificationService.error(message);
          this.loading.set(false);
        },
      });
  }

  search(value: string): void {
    this.q.set(value);
    this.page.set(1);
    this.load({ refreshCounts: true });
  }

  setFilter(
    key: 'concern' | 'language' | 'modality' | 'sessionType' | 'ageGroup',
    value: string,
  ): void {
    this[key].set(value);
    this.page.set(1);
    this.load({ refreshCounts: true });
  }

  setRoleGroup(value: RoleGroup): void {
    this.roleGroup.set(value);
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.q.set('');
    this.concern.set('');
    this.language.set('');
    this.modality.set('');
    this.sessionType.set('');
    this.ageGroup.set('');
    this.roleGroup.set('');
    this.page.set(1);
    this.load({ refreshCounts: true });
  }

  private hydrateFiltersFromUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    const role = params.get('roleGroup') || '';
    this.q.set(params.get('q') || '');
    this.concern.set(params.get('concern') || '');
    this.language.set(params.get('language') || '');
    this.modality.set(params.get('modality') || '');
    this.sessionType.set(params.get('sessionType') || '');
    this.ageGroup.set(params.get('ageGroup') || '');
    this.roleGroup.set(this.isRoleGroup(role) ? role : '');
    const page = Number(params.get('page') || 1);
    this.page.set(Number.isFinite(page) && page > 0 ? page : 1);
  }

  private syncUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.q() || null,
        roleGroup: this.roleGroup() || null,
        concern: this.concern() || null,
        language: this.language() || null,
        modality: this.modality() || null,
        sessionType: this.sessionType() || null,
        ageGroup: this.ageGroup() || null,
        page: this.page() > 1 ? this.page() : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private isRoleGroup(value: string): value is RoleGroup {
    return this.roleTabs.some((tab) => tab.value === value);
  }

  private loadRoleCounts(): void {
    const base = {
      q: this.q(),
      concern: this.concern(),
      language: this.language(),
      modality: this.modality(),
      sessionType: this.sessionType(),
      ageGroup: this.ageGroup(),
      page: 1,
      pageSize: 1,
    };
    Promise.all(
      this.roleTabs.map((tab) =>
        firstValueFrom(this.bookingService.providers({ ...base, roleGroup: tab.value }))
          .then((res) => [tab.value, res?.pagination.total ?? 0] as const)
          .catch(() => [tab.value, 0] as const),
      ),
    ).then((entries) => {
      this.roleCounts.set(Object.fromEntries(entries) as Record<RoleGroup, number>);
    });
  }

  recommendedHint(): string {
    const concern = `${this.concern()} ${this.q()}`.toLowerCase();
    if (/anxiety|stress|panic|depress|trauma|relationship|family/.test(concern)) {
      return 'Recommended: start with Professionals or Counsellors for structured support.';
    }
    if (/lonely|loneliness|breakup|motivation|heartbreak|friend/.test(concern)) {
      return 'Recommended: Peer volunteers or Coaches may be a softer first step.';
    }
    if (/study|career|exam|focus|job/.test(concern)) {
      return 'Recommended: Career / Study Mentors first, then Counsellors if emotions feel heavy.';
    }
    if (/breath|sleep|relax|mindful|meditation/.test(concern)) {
      return 'Recommended: Wellness guides for breathing and grounding practice.';
    }
    return 'Tip: choose a provider type tab if you already know the kind of support you want.';
  }

  roleCount(value: RoleGroup): number {
    return this.roleCounts()[value] || 0;
  }

  bestMatchLabel(provider: HopeHubProvider): string {
    const concernText = `${this.concern()} ${this.q()}`.toLowerCase();
    const role = provider.supportRole || '';
    const tone = provider.supportTierTone || '';
    if (/anxiety|stress|panic|depress|trauma|relationship|family/.test(concernText)) {
      if (tone === 'professional' || role === 'QUALIFIED_COUNSELLOR') return 'Best match';
    }
    if (/lonely|loneliness|breakup|motivation|heartbreak|friend/.test(concernText)) {
      if (role === 'PEER_SUPPORT_VOLUNTEER' || tone === 'coach') return 'Best match';
    }
    if (/study|career|exam|focus|job/.test(concernText)) {
      if (role === 'CAREER_STUDY_MENTOR' || tone === 'coach') return 'Best match';
    }
    if (/breath|sleep|relax|mindful|meditation/.test(concernText)) {
      if (role === 'MEDITATION_BREATHWORK_GUIDE' || tone === 'wellness') return 'Best match';
    }
    if (this.roleGroup()) return 'Selected type';
    return '';
  }

  emptySuggestion(): string {
    const tab = this.roleTabs.find((item) => item.value === this.roleGroup());
    if (this.roleGroup() === 'VOLUNTEERS') {
      return 'No volunteers match this filter right now. Try Counsellors or send a general request so the team can guide you.';
    }
    if (this.roleGroup() === 'PROFESSIONALS' || this.roleGroup() === 'COUNSELLORS') {
      return 'No professional/counsellor match found for this filter. Try All, adjust concern/language, or book a general request.';
    }
    if (this.roleGroup()) {
      return `No ${tab?.label.toLowerCase()} match this filter right now. Try All or send a general request.`;
    }
    return 'No profiles match these filters. Try clearing filters or book a general request.';
  }

  private sortedProviders(providers: HopeHubProvider[]): HopeHubProvider[] {
    const concernText = `${this.concern()} ${this.q()}`.toLowerCase();
    const roleWeight = (provider: HopeHubProvider) => {
      const tone = provider.supportTierTone || '';
      const role = provider.supportRole || '';
      if (/anxiety|stress|panic|depress|trauma|relationship|family/.test(concernText)) {
        if (tone === 'professional') return 0;
        if (role === 'QUALIFIED_COUNSELLOR') return 1;
      }
      if (/lonely|loneliness|breakup|motivation|heartbreak|friend/.test(concernText)) {
        if (role === 'PEER_SUPPORT_VOLUNTEER') return 0;
        if (tone === 'coach') return 1;
      }
      if (/study|career|exam|focus|job/.test(concernText)) {
        if (role === 'CAREER_STUDY_MENTOR') return 0;
        if (tone === 'coach') return 1;
      }
      if (/breath|sleep|relax|mindful|meditation/.test(concernText)) {
        if (role === 'MEDITATION_BREATHWORK_GUIDE') return 0;
        if (tone === 'wellness') return 1;
      }
      return 5;
    };
    return [...providers].sort((a, b) => {
      const byRole = roleWeight(a) - roleWeight(b);
      if (byRole) return byRole;
      const aHasService = a.services?.length ? 0 : 1;
      const bHasService = b.services?.length ? 0 : 1;
      if (aHasService !== bHasService) return aHasService - bHasService;
      return a.name.localeCompare(b.name);
    });
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) {
      return;
    }
    this.page.set(page);
    this.load();
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, index) => index + 1);
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

  providerRoleLabel(provider: HopeHubProvider): string {
    return provider.supportRoleLabel || this.publicConfig.defaultCareRoleLabel;
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
    }
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

  providerTierLabel(provider: HopeHubProvider): string {
    return provider.supportTierLabel || (provider.isClinicalCare ? 'Professional care' : 'Support');
  }

  providerRoleDescription(provider: HopeHubProvider): string {
    return (
      provider.supportRoleDescription ||
      'Hope Hub support for emotional wellness and guided conversation.'
    );
  }

  providerBestFor(provider: HopeHubProvider): string[] {
    return provider.supportBestFor?.length
      ? provider.supportBestFor
      : provider.focusAreas.slice(0, 3);
  }

  providerScope(provider: HopeHubProvider): string {
    return (
      provider.supportScope || 'Support scope depends on the person’s qualification and service.'
    );
  }

  primaryService(provider: HopeHubProvider) {
    return provider.services?.[0] ?? null;
  }

  bookingQueryParams(provider: HopeHubProvider, service: CareTeamListService | null = null) {
    const directProviderPrice =
      (provider.sessionFeeInPaise ?? this.publicConfig.defaultSessionPriceInPaise) / 100;
    return {
      service: service?.title || this.publicConfig.defaultServiceName,
      serviceName: service?.title || this.publicConfig.defaultServiceName,
      consultant: provider.name,
      providerId: provider.id,
      careTeamServiceId: service?.id || '',
      duration: service
        ? `${service.durationMinutes} minutes`
        : this.publicConfig.defaultSessionLabel,
      price: service
        ? (service.effectivePriceInPaise ?? service.priceInPaise) / 100
        : directProviderPrice,
      source: service ? 'care-team-service-list' : 'care-team-list',
    };
  }

  bookingCta(provider: HopeHubProvider): string {
    return provider.bookingCtaLabel || 'Book session';
  }
}
