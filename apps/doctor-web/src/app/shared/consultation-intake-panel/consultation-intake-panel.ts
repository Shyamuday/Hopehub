import { Component, Input } from '@angular/core';
import { DetailRowsComponent, type DetailRow } from '@hopehub/platform-ui';
import type { ConsultationSummary } from '../../features/case-analysis/case-analysis-page.types';
import type { DoctorConsultation } from '../../core/types/consultation.types';

@Component({
  selector: 'app-consultation-intake-panel',
  imports: [DetailRowsComponent],
  templateUrl: './consultation-intake-panel.html',
  styleUrl: './consultation-intake-panel.scss'
})
export class ConsultationIntakePanelComponent {
  @Input({ required: true }) consultation!: ConsultationSummary | DoctorConsultation;

  rows(): DetailRow[] {
    const answers = this.consultation.intakeAnswers;
    if (!answers || !Object.keys(answers).length) {
      return [];
    }

    return Object.entries(answers).map(([question, answer]) => ({
      label: question,
      value: String(answer)
    }));
  }

  hasIntake() {
    return this.rows().length > 0;
  }
}
