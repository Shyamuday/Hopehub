import { Component, Input, output } from '@angular/core';
import type { ApproachDefinition } from '@vitalis/homeopathy-approaches';

@Component({
  selector: 'app-prescription-handoff-panel',
  templateUrl: './prescription-handoff-panel.html',
  styleUrl: './prescription-handoff-panel.scss'
})
export class PrescriptionHandoffPanelComponent {
  @Input() approach: ApproachDefinition | null = null;
  @Input() selectedRemedyName = '';
  @Input() protocolPrimaryRemedy = '';
  @Input() protocolCompanionRemedy = '';
  @Input() handoffAdvice = '';
  @Input() disabled = false;

  readonly handoff = output<void>();
}
