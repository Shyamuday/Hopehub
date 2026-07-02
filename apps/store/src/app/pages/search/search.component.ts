import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, takeUntil } from 'rxjs';
import { StoreApiService } from '../../services/store-api.service';
import { MedicineWithStock } from '../../models';
import { DEFAULT_PAGE, PAGE_SIZES } from '../../core/constants/pagination.constants';

@Component({
  selector: 'app-search',
  imports: [FormsModule, RouterLink],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent implements OnDestroy {
  private api = inject(StoreApiService);

  query = signal('');
  selectedPotency = signal('');
  medicines = signal<MedicineWithStock[]>([]);
  loading = signal(false);
  total = signal(0);
  page = signal(1);
  hasMore = signal(false);
  isListening = signal(false);

  private searchSubject = new Subject<{ q: string; potency: string }>();
  private destroy$ = new Subject<void>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;

  potencyFilters = [
    { label: 'All', value: '' },
    { label: '30C', value: '30C' },
    { label: '200C', value: '200C' },
    { label: '1M', value: '1M' },
    { label: 'Q', value: 'Q' },
  ];

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => a.q === b.q && a.potency === b.potency),
      switchMap(({ q, potency }) => {
        this.loading.set(true);
        this.page.set(DEFAULT_PAGE);
        return this.api.getMedicines({ q, potency, page: DEFAULT_PAGE, pageSize: PAGE_SIZES.SEARCH });
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.medicines.set(res.medicines);
        this.total.set(res.pagination.total);
        this.hasMore.set(res.pagination.page < res.pagination.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch(val: string): void {
    this.query.set(val);
    this.searchSubject.next({ q: val, potency: this.selectedPotency() });
  }

  setPotency(p: string): void {
    this.selectedPotency.set(p);
    this.searchSubject.next({ q: this.query(), potency: p });
  }

  clearSearch(): void {
    this.query.set('');
    this.medicines.set([]);
    this.total.set(0);
  }

  loadMore(): void {
    const next = this.page() + 1;
    this.api.getMedicines({ q: this.query(), potency: this.selectedPotency(), page: next, pageSize: PAGE_SIZES.SEARCH }).subscribe({
      next: (res) => {
        this.medicines.update(list => [...list, ...res.medicines]);
        this.page.set(next);
        this.hasMore.set(res.pagination.page < res.pagination.totalPages);
      }
    });
  }

  toggleVoice(): void {
    if (this.isListening()) {
      this.recognition?.stop();
      this.isListening.set(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice search not supported in this browser');
      return;
    }
    this.recognition = new SR();
    this.recognition.lang = 'en-IN';
    this.recognition.interimResults = false;
    this.recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      this.onSearch(text);
      this.isListening.set(false);
    };
    this.recognition.onend = () => this.isListening.set(false);
    this.recognition.onerror = () => this.isListening.set(false);
    this.recognition.start();
    this.isListening.set(true);
  }

  getStatusClass(med: MedicineWithStock): string {
    if (med.status === 'OUT_OF_STOCK') return 'status-red';
    if (med.status === 'LOW_STOCK') return 'status-yellow';
    return 'status-green';
  }

  getQtyClass(med: MedicineWithStock): string {
    if (med.status === 'OUT_OF_STOCK') return 'qty-red';
    if (med.status === 'LOW_STOCK') return 'qty-yellow';
    return 'qty-green';
  }

  getPotencyClass(potency: string): string {
    const p = potency?.toLowerCase() ?? '';
    if (p.includes('30c')) return 'badge potency-30c';
    if (p.includes('200c')) return 'badge potency-200c';
    if (p.includes('1m') || p.includes('10m')) return 'badge potency-1m';
    if (p.includes('q') || p.includes('mother')) return 'badge potency-q';
    return 'badge potency-other';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.recognition?.stop();
  }
}
