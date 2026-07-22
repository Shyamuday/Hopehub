import { Component, OnInit, Inject, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LifestyleTip,
  LifestyleTipType,
  LifestyleTipCategory,
  LifestyleTipDifficulty
} from '../../../core/models/lifestyle-tip.model';
import {
  ALL_LIFESTYLE_TIPS,
  LIFESTYLE_TIPS_BY_TYPE,
  LIFESTYLE_TIPS_BY_CATEGORY,
  getLifestyleTipsByIds,
  getLifestyleTipsByCategory,
  searchLifestyleTips,
  getRelatedLifestyleTips
} from '../../../core/data/lifestyle-tip-configs';
import { getLifestyleTipRecommendations } from '../../../core/data/lifestyle-tip-recommendations';

@Component({
  selector: 'app-lifestyle-tips',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './lifestyle-tips.component.html',
  styleUrl: './lifestyle-tips.component.scss'
})
export class LifestyleTipsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Signal-based state
  allTips = signal<LifestyleTip[]>(ALL_LIFESTYLE_TIPS);
  filteredTips = signal<LifestyleTip[]>(ALL_LIFESTYLE_TIPS);
  recommendedTips = signal<LifestyleTip[]>([]);
  relatedTips = signal<LifestyleTip[]>([]);

  categories = signal<LifestyleTipCategory[]>(Object.values(LifestyleTipCategory));
  types = signal<LifestyleTipType[]>(Object.values(LifestyleTipType));

  selectedTip = signal<LifestyleTip | null>(null);
  currentFilter = signal<string>('all');
  searchQuery = signal<string>('');

  assessmentInfo = signal<{
    type: string;
    score: number;
    level: string;
  } | null>(null);

  constructor() {
    // Check for recommended tips from assessment results
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe((params: { [key: string]: any }) => {
        if (params['recommended']) {
          const recommendedIds = params['recommended'].split(',');
          this.recommendedTips.set(getLifestyleTipsByIds(recommendedIds));

          if (params['assessment'] && params['score'] && params['level']) {
            this.assessmentInfo.set({
              type: params['assessment'],
              score: parseInt(params['score']),
              level: params['level']
            });
          }
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
          const tip = this.allTips().find(t => t.id === params['tip']);
          if (tip) {
            this.selectTip(tip);
          }
        }
      });
  }

  ngOnInit() {
    this.filteredTips.set(this.allTips());
  }

  setFilter(type: string, value?: string) {
    if (type === 'all') {
      this.currentFilter.set('all');
      this.filteredTips.set(this.allTips());
    } else if (type === 'category' && value) {
      this.currentFilter.set(`category:${value}`);
      this.filteredTips.set(getLifestyleTipsByCategory(value as LifestyleTipCategory));
    } else if (type === 'type' && value) {
      this.currentFilter.set(`type:${value}`);
      this.filteredTips.set(this.allTips().filter(tip => tip.type === value));
    }

    // Apply search if active
    if (this.searchQuery()) {
      this.onSearch();
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
        this.filteredTips.set(getLifestyleTipsByCategory(category));
      } else if (filter.startsWith('type:')) {
        const type = filter.split(':')[1];
        this.filteredTips.set(this.allTips().filter(tip => tip.type === type));
      }
    } else {
      // Search within current filter
      const searchResults = searchLifestyleTips(query);
      const filter = this.currentFilter();

      if (filter === 'all') {
        this.filteredTips.set(searchResults);
      } else if (filter.startsWith('category:')) {
        const category = filter.split(':')[1] as LifestyleTipCategory;
        this.filteredTips.set(searchResults.filter(tip => tip.category.includes(category)));
      } else if (filter.startsWith('type:')) {
        const type = filter.split(':')[1];
        this.filteredTips.set(searchResults.filter(tip => tip.type === type));
      }
    }
  }

  selectTip(tip: LifestyleTip) {
    this.selectedTip.set(tip);
    this.relatedTips.set(getRelatedLifestyleTips(tip.id));

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
    return LIFESTYLE_TIPS_BY_CATEGORY[category]?.length || 0;
  }

  getTypeCount(type: LifestyleTipType): number {
    return LIFESTYLE_TIPS_BY_TYPE[type]?.length || 0;
  }
}
