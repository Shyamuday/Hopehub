import { Component, Input } from '@angular/core';
import {
  flattenMethodIntakeFields,
  methodIntakeRowsWithSectionHeaders,
  type MethodIntakeField,
  type MethodIntakeFlatRow
} from '../method-intake';
import { MethodIntakeFieldRowsComponent } from '../method-intake-field-rows/method-intake-field-rows.component';

@Component({
  selector: 'app-kingdom-diagnosis-panel',
  standalone: true,
  imports: [MethodIntakeFieldRowsComponent],
  templateUrl: './kingdom-diagnosis-panel.component.html',
  styleUrl: './kingdom-diagnosis-panel.component.scss'
})
export class KingdomDiagnosisPanelComponent {
  @Input() group: MethodIntakeField | null = null;
  @Input() heading = 'Kingdom diagnosis';
  @Input() description = '';
  @Input({ required: true }) values!: Record<string, string>;

  readonly idPrefix = 'kingdom';

  get rows(): Array<MethodIntakeFlatRow & { showSectionHeader: boolean }> {
    if (!this.group || this.group.type !== 'structured_group') {
      return [];
    }
    return methodIntakeRowsWithSectionHeaders(flattenMethodIntakeFields([this.group]));
  }
}
