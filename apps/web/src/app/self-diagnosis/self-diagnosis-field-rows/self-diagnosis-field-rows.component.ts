import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RANKED_CHECKLIST_MAX,
  type MethodIntakeFlatRow,
  parseRankedChecklistJson,
  stringifyRankedChecklist
} from '../self-diagnosis-intake';

@Component({
  selector: 'app-self-diagnosis-field-rows',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './self-diagnosis-field-rows.component.html',
  styleUrl: './self-diagnosis-field-rows.component.scss'
})
export class SelfDiagnosisFieldRowsComponent {
  @Input({ required: true }) idPrefix!: string;
  @Input({ required: true }) rows!: Array<MethodIntakeFlatRow & { showSectionHeader: boolean }>;
  @Input({ required: true }) values!: Record<string, string>;

  readonly intensityOptions: number[] = Array.from({ length: RANKED_CHECKLIST_MAX }, (_, i) => i + 1);

  private rankedState(storageKey: string): Record<string, number> {
    return parseRankedChecklistJson(this.values[storageKey]);
  }

  private writeRanked(storageKey: string, map: Record<string, number>): void {
    this.values[storageKey] = stringifyRankedChecklist(map);
  }

  rankedChecked(storageKey: string, option: string): boolean {
    return this.rankedState(storageKey)[option] != null;
  }

  rankedIntensity(storageKey: string, option: string): number {
    return this.rankedState(storageKey)[option] ?? 1;
  }

  toggleRanked(storageKey: string, options: string[], option: string, checked: boolean): void {
    const map = { ...this.rankedState(storageKey) };
    if (checked) {
      if (map[option] == null) {
        const used = new Set(Object.values(map));
        let r = 1;
        while (r <= RANKED_CHECKLIST_MAX && used.has(r)) {
          r++;
        }
        map[option] = r <= RANKED_CHECKLIST_MAX ? r : RANKED_CHECKLIST_MAX;
      }
    } else {
      delete map[option];
    }
    this.writeRanked(storageKey, map);
  }

  setRankedIntensity(storageKey: string, option: string, intensity: number): void {
    const map = { ...this.rankedState(storageKey) };
    if (map[option] == null) {
      return;
    }
    const clamped = Math.max(1, Math.min(RANKED_CHECKLIST_MAX, Math.round(intensity)));
    map[option] = clamped;
    this.writeRanked(storageKey, map);
  }

  autoIntensityInListOrder(storageKey: string, options: string[]): void {
    const map = { ...this.rankedState(storageKey) };
    let n = 1;
    for (const o of options) {
      if (map[o] != null) {
        map[o] = Math.min(n, RANKED_CHECKLIST_MAX);
        n++;
      }
    }
    this.writeRanked(storageKey, map);
  }
}
