import { Component, Input, output } from '@angular/core';
import type { ClinicalMediaImageAnalysis } from '../../clinical-media.types';

@Component({
  selector: 'app-clinical-media-analysis-panel',
  templateUrl: './clinical-media-analysis-panel.html',
  styleUrl: './clinical-media-analysis-panel.scss'
})
export class ClinicalMediaAnalysisPanelComponent {
  @Input({ required: true }) preview!: ClinicalMediaImageAnalysis;

  readonly rubricPhraseSelected = output<string>();
  readonly useObservationsRequested = output<void>();
  readonly dismissRequested = output<void>();
}
