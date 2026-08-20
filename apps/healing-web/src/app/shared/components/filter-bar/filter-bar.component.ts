import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FormDropdownComponent,
  FormDropdownOption,
} from '../form-dropdown/form-dropdown.component';
import { ViewportOverlayService } from '../../../core/services/viewport-overlay.service';

export type FilterBarFilter = {
  key: string;
  label: string;
  placeholder?: string;
  value: string;
  options: FormDropdownOption[];
};

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [FormsModule, FormDropdownComponent],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.scss',
})
export class FilterBarComponent {
  private readonly overlay = inject(ViewportOverlayService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overlayOwner = `mobile-filter-${Math.random().toString(36).slice(2)}`;
  @Input() searchValue = '';
  @Input() searchPlaceholder = 'Search...';
  @Input() filters: FilterBarFilter[] = [];
  @Input({ transform: booleanAttribute }) showSearch = true;
  @Input({ transform: booleanAttribute }) compact = false;
  @Input({ transform: booleanAttribute }) collapsible = true;

  @Output() searchValueChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ key: string; value: string }>();
  readonly expanded = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.overlay.release(this.overlayOwner));
  }

  onSearch(value: string): void {
    this.searchValueChange.emit(value);
  }

  onFilterChange(key: string, value: string): void {
    this.filterChange.emit({ key, value });
  }

  selectedFilters(): FilterBarFilter[] {
    return this.filters.filter((filter) => Boolean(filter.value));
  }

  selectedLabel(filter: FilterBarFilter): string {
    return filter.options.find((option) => option.value === filter.value)?.label || filter.value;
  }

  clearFilter(key: string): void {
    this.filterChange.emit({ key, value: '' });
  }

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
    this.syncOverlayLock();
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    this.syncOverlayLock();
  }

  private syncOverlayLock(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const isMobileSheet = this.expanded() && window.matchMedia('(max-width: 640px)').matches;
    if (isMobileSheet) this.overlay.acquire(this.overlayOwner);
    else this.overlay.release(this.overlayOwner);
  }
}
