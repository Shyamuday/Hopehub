import { Component, Input } from '@angular/core';
import {
  flattenMethodIntakeFields,
  methodIntakeRowsWithSectionHeaders,
  type MethodIntakeField,
  type MethodIntakeFlatRow
} from '../method-intake';
import { MethodIntakeFieldRowsComponent } from '../method-intake-field-rows/method-intake-field-rows.component';

@Component({
  selector: 'app-miasm-diagnosis-panel',
  standalone: true,
  imports: [MethodIntakeFieldRowsComponent],
  templateUrl: './miasm-diagnosis-panel.component.html',
  styleUrl: './miasm-diagnosis-panel.component.scss'
})
export class MiasmDiagnosisPanelComponent {
  @Input() group: MethodIntakeField | null = null;
  @Input() heading = 'Miasm diagnosis';
  @Input() description = '';
  @Input({ required: true }) values!: Record<string, string>;

  readonly idPrefix = 'miasm';

  get rows(): Array<MethodIntakeFlatRow & { showSectionHeader: boolean }> {
    if (!this.group || this.group.type !== 'structured_group') {
      return [];
    }
    return methodIntakeRowsWithSectionHeaders(flattenMethodIntakeFields([this.group]));
  }
}
