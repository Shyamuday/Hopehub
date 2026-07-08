import { Component, HostListener, Input, OnChanges, computed, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { ApproachDefinition } from '@vitalis/homeopathy-approaches';

@Component({
  selector: 'app-approach-overview-panel',
  imports: [FormField],
  templateUrl: './approach-overview-panel.html',
  styleUrl: './approach-overview-panel.scss'
})
export class ApproachOverviewPanelComponent implements OnChanges {
  @Input({ required: true }) methods: Array<{ id: string; label: string; normalizedLabel?: string }> = [];
  @Input({ required: true }) selectedMethodOptionId = '';
  @Input() approach: ApproachDefinition | null = null;
  @Input() saving = false;

  readonly approachChanged = output<string>();

  readonly pickerOpen = signal(false);
  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);

  readonly selectedMethodLabel = computed(() => {
    const selected = this.methods.find((item) => item.id === this.selectedMethodOptionId);
    return selected?.label || this.approach?.title || 'Select approach';
  });

  readonly filteredMethods = computed(() => {
    const query = this.searchModel().query.trim().toLowerCase();
    if (!query) return this.methods;
    return this.methods.filter((method) => method.label.toLowerCase().includes(query));
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.approach-picker-root')) {
      this.closePicker();
    }
  }

  ngOnChanges() {
    if (this.selectedMethodOptionId && !this.filteredMethods().some((item) => item.id === this.selectedMethodOptionId)) {
      this.searchModel.set({ query: '' });
    }
  }

  togglePicker() {
    if (this.saving) return;
    if (this.pickerOpen()) {
      this.closePicker();
      return;
    }
    this.pickerOpen.set(true);
  }

  closePicker() {
    if (!this.pickerOpen()) return;
    this.pickerOpen.set(false);
    this.searchModel.set({ query: '' });
  }

  selectMethod(methodOptionId: string) {
    if (this.saving) return;
    this.closePicker();
    if (methodOptionId === this.selectedMethodOptionId) return;
    this.approachChanged.emit(methodOptionId);
  }
}
