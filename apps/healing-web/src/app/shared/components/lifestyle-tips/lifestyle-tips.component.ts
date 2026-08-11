import {
  Component,
  DestroyRef,
  OnInit,
  Inject,
  PLATFORM_ID,
  inject,
  signal,
  computed,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormDropdownComponent,
  FormDropdownOption,
} from '../form-dropdown/form-dropdown.component';
import {
  LifestyleTip,
  LifestyleTipType,
  LifestyleTipCategory,
  LifestyleTipDifficulty,
} from '../../../core/models/lifestyle-tip.model';
import { LifestyleTipService } from '../../../core/services/lifestyle-tip.service';
import { CONSUMER_UX_COPY } from '../../../core/constants/consumer-ux-copy.constants';

@Component({
  selector: 'app-lifestyle-tips',
  standalone: true,
  imports: [FormsModule, RouterModule, FormDropdownComponent],
  templateUrl: './lifestyle-tips.component.html',
  styleUrl: './lifestyle-tips.component.scss',
})
export class LifestyleTipsComponent implements OnInit {
  readonly UX = CONSUMER_UX_COPY;
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private lifestyleTipService = inject(LifestyleTipService);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Signal-based state
  allTips = signal<LifestyleTip[]>([]);
  filteredTips = signal<LifestyleTip[]>([]);
  recommendedTips = signal<LifestyleTip[]>([]);
  relatedTips = signal<LifestyleTip[]>([]);

  categories = signal<LifestyleTipCategory[]>(Object.values(LifestyleTipCategory));
  types = signal<LifestyleTipType[]>(Object.values(LifestyleTipType));

  selectedTip = signal<LifestyleTip | null>(null);
  currentFilter = signal<string>('all');
  searchQuery = signal<string>('');
  readonly filterOptions = computed<FormDropdownOption[]>(() => [
    { value: 'all', label: `All tips (${this.allTips().length})` },
    ...this.categories().map((category) => ({
      value: `category:${category}`,
      label: `${category} (${this.getCategoryCount(category)})`,
    })),
    ...this.types().map((type) => ({
      value: `type:${type}`,
      label: `${type} (${this.getTypeCount(type)})`,
    })),
  ]);

  assessmentInfo = signal<{
    type: string;
    score: number;
    level: string;
  } | null>(null);

  constructor() {}

  ngOnInit() {
    this.filteredTips.set(this.allTips());
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params: { [key: string]: any }) => {
        this.loadPageData(params);
      });
  }

  private loadPageData(params: { [key: string]: any }): void {
    this.lifestyleTipService
      .pageData({
        assessmentType: params['assessment'],
        concern: params['concern'],
        score: params['score'],
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pageData) => {
          this.allTips.set(pageData.tips);
          this.filteredTips.set(pageData.tips);
          this.applyQueryParams(params, pageData.recommendations);
        },
        error: () => {
          this.allTips.set([]);
          this.filteredTips.set([]);
          this.applyQueryParams(params, []);
        },
      });
  }

  setFilter(type: string, value?: string) {
    if (type === 'all') {
      this.currentFilter.set('all');
      this.filteredTips.set(this.allTips());
    } else if (type === 'category' && value) {
      this.currentFilter.set(`category:${value}`);
      this.filteredTips.set(
        this.allTips().filter((tip) => tip.category.includes(value as LifestyleTipCategory)),
      );
    } else if (type === 'type' && value) {
      this.currentFilter.set(`type:${value}`);
      this.filteredTips.set(this.allTips().filter((tip) => tip.type === value));
    }

    // Apply search if active
    if (this.searchQuery()) {
      this.onSearch();
    }
  }

  applyFilterValue(value: string) {
    if (value === 'all') {
      this.setFilter('all');
      return;
    }

    const [type, filterValue] = value.split(':');
    if ((type === 'category' || type === 'type') && filterValue) {
      this.setFilter(type, filterValue);
    }
  }

  onSearch() {
    const query = this.searchQuery();
    if (!query.trim()) {
      // Reset to current filter
      const filter = this.currentFilter();
      if (filter === 'all') {
        this.filteredTips.set(this.allTips());
      } else if (filter.startsWith('category:')) {
        const category = filter.split(':')[1] as LifestyleTipCategory;
        this.filteredTips.set(this.allTips().filter((tip) => tip.category.includes(category)));
      } else if (filter.startsWith('type:')) {
        const type = filter.split(':')[1];
        this.filteredTips.set(this.allTips().filter((tip) => tip.type === type));
      }
    } else {
      // Search within current filter
      const searchResults = this.searchTips(query, this.allTips());
      const filter = this.currentFilter();

      if (filter === 'all') {
        this.filteredTips.set(searchResults);
      } else if (filter.startsWith('category:')) {
        const category = filter.split(':')[1] as LifestyleTipCategory;
        this.filteredTips.set(searchResults.filter((tip) => tip.category.includes(category)));
      } else if (filter.startsWith('type:')) {
        const type = filter.split(':')[1];
        this.filteredTips.set(searchResults.filter((tip) => tip.type === type));
      }
    }
  }

  selectTip(tip: LifestyleTip) {
    this.selectedTip.set(tip);
    const relatedIds = tip.relatedTips || [];
    this.relatedTips.set(
      this.allTips().filter(
        (item) =>
          relatedIds.includes(item.id) || (item.sourceSlug && relatedIds.includes(item.sourceSlug)),
      ),
    );

    // Scroll to top
    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goBack() {
    this.selectedTip.set(null);
    this.relatedTips.set([]);
  }

  getCategoryCount(category: LifestyleTipCategory): number {
    return this.allTips().filter((tip) => tip.category.includes(category)).length;
  }

  getTypeCount(type: LifestyleTipType): number {
    return this.allTips().filter((tip) => tip.type === type).length;
  }

  private applyQueryParams(params: { [key: string]: any }, backendRecommendations: LifestyleTip[]) {
    if (params['assessment'] && params['score'] && params['level']) {
      this.assessmentInfo.set({
        type: params['assessment'],
        score: parseInt(params['score']),
        level: params['level'],
      });
    }

    if (params['recommended']) {
      const recommendedIds = params['recommended'].split(',');
      const fromCurrentTips = this.allTips().filter(
        (tip) =>
          recommendedIds.includes(tip.id) ||
          (tip.sourceSlug && recommendedIds.includes(tip.sourceSlug)),
      );
      this.recommendedTips.set(fromCurrentTips);
    }

    if (backendRecommendations.length) {
      this.recommendedTips.set(backendRecommendations);
    }

    // Check for category filter
    if (params['category']) {
      const category = params['category'] as LifestyleTipCategory;
      if (this.categories().includes(category)) {
        this.setFilter('category', category);
      }
    }

    // Check for specific tip
    if (params['tip']) {
      const tip = this.allTips().find(
        (t) => t.id === params['tip'] || t.sourceSlug === params['tip'],
      );
      if (tip) {
        this.selectTip(tip);
      }
    }
  }

  private searchTips(query: string, tips: LifestyleTip[]): LifestyleTip[] {
    const searchTerm = query.toLowerCase();
    return tips.filter(
      (tip) =>
        tip.title.toLowerCase().includes(searchTerm) ||
        tip.description.toLowerCase().includes(searchTerm) ||
        tip.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
        tip.benefits.some((benefit) => benefit.toLowerCase().includes(searchTerm)),
    );
  }
}
