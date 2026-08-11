import { booleanAttribute, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FormDropdownComponent,
  FormDropdownOption,
} from '../form-dropdown/form-dropdown.component';

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
  @Input() searchValue = '';
  @Input() searchPlaceholder = 'Search...';
  @Input() filters: FilterBarFilter[] = [];
  @Input({ transform: booleanAttribute }) showSearch = true;
  @Input({ transform: booleanAttribute }) compact = false;

  @Output() searchValueChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ key: string; value: string }>();

  onSearch(value: string): void {
    this.searchValueChange.emit(value);
  }

  onFilterChange(key: string, value: string): void {
    this.filterChange.emit({ key, value });
  }
}
