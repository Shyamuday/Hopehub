import { Component, Input } from '@angular/core';
import { fieldDoctorGuidanceLines, type ApproachFieldDef } from '@hopehub/homeopathy-approaches';

@Component({
  selector: 'app-approach-field-hint',
  template: `
    <span class="field-hint-trigger" tabindex="0" aria-label="Field guidance">
      <span class="field-hint-icon" aria-hidden="true">?</span>
      <span class="field-hint-popover" role="tooltip">
        @for (line of guidanceLines; track $index) {
          <p>{{ line }}</p>
        }
      </span>
    </span>
  `,
  styleUrl: './approach-field-hint.scss'
})
export class ApproachFieldHintComponent {
  @Input({ required: true }) field!: ApproachFieldDef;

  get guidanceLines() {
    return fieldDoctorGuidanceLines(this.field);
  }
}
