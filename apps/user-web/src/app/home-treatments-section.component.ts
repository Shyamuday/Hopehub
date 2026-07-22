import { Component, signal } from '@angular/core';
import {
  HOME_CONTENT,
  HOME_STATS_FALLBACK,
  type PublicStat,
} from './core/constants/public-site-content.constants';
import { PublicConfigService } from './core/services/public-config.service';

@Component({
  selector: 'app-home-treatments-section',
  templateUrl: './home-treatments-section.component.html',
})
export class HomeTreatmentsSectionComponent {
  readonly copy = HOME_CONTENT;
  readonly stats = signal<PublicStat[]>([...HOME_STATS_FALLBACK]);

  constructor(private readonly configSvc: PublicConfigService) {
    void this.loadStats();
  }

  private async loadStats() {
    try {
      const cfg = await this.configSvc.get();
      this.stats.set([
        { value: cfg.statConsultations, label: 'Consultations completed' },
        { value: cfg.statDoctors, label: 'Experienced providers' },
        { value: cfg.statRating, label: 'Patient rating' },
        { value: cfg.statFollowUp, label: 'Follow-up compliance' },
      ]);
    } catch {
      /* keep fallback */
    }
  }
}
