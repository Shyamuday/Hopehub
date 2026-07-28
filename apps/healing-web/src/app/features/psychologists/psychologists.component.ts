import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';

@Component({
  selector: 'app-psychologists',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './psychologists.component.html',
})
export class PsychologistsComponent implements OnInit {
  private readonly bookingService = inject(BookingService);

  readonly providers = signal<HopeHubProvider[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly q = signal('');
  readonly concern = signal('');
  readonly language = signal('');
  readonly modality = signal('');
  readonly sessionType = signal('');
  readonly ageGroup = signal('');
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly total = signal(0);
  readonly totalPages = signal(1);
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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.bookingService
      .providers({
        page: this.page(),
        pageSize: this.pageSize,
        q: this.q(),
        concern: this.concern(),
        language: this.language(),
        modality: this.modality(),
        sessionType: this.sessionType(),
        ageGroup: this.ageGroup(),
      })
      .subscribe({
        next: (res) => {
          this.providers.set(res.providers);
          this.total.set(res.pagination.total);
          this.totalPages.set(res.pagination.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load psychologists right now.');
          this.loading.set(false);
        },
      });
  }

  search(value: string): void {
    this.q.set(value);
    this.page.set(1);
    this.load();
  }

  setFilter(
    key: 'concern' | 'language' | 'modality' | 'sessionType' | 'ageGroup',
    value: string,
  ): void {
    this[key].set(value);
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
    this.page.set(1);
    this.load();
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
}
