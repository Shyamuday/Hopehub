import { Component, Input, OnChanges, computed, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { ApproachDefinition } from '@vitalis/homeopathy-approaches';

@Component({
  selector: 'app-approach-overview-panel',
  imports: [FormField],
  templateUrl: './approach-overview-panel.html',
  styleUrl: './approach-overview-panel.scss'
})
export class ApproachOverviewPanelComponent implements OnChanges {
  @Input({ required: true }) methods: Array<{ id: string; label: string }> = [];
  @Input({ required: true }) selectedMethodOptionId = '';
  @Input() approach: ApproachDefinition | null = null;
  @Input() saving = false;

  readonly approachChanged = output<string>();

  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);

  readonly filteredMethods = computed(() => {
    const query = this.searchModel().query.trim().toLowerCase();
    if (!query) return this.methods;
    return this.methods.filter((method) => method.label.toLowerCase().includes(query));
  });

  ngOnChanges() {
    if (this.selectedMethodOptionId && !this.filteredMethods().some((item) => item.id === this.selectedMethodOptionId)) {
      this.searchModel.set({ query: '' });
    }
  }

  onSelect(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.approachChanged.emit(value);
  }
}
