import { CommonModule } from '@angular/common';
import { Component, type OnInit, signal } from '@angular/core';
import { type ActivatedRoute } from '@angular/router';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { diseaseInfos } from '../constants';
import type { DiseaseInfo } from '../interfaces';
import { type AppOverlayService } from '../overlay.service';
import { openPublicAuthOverlay } from './open-public-auth-overlay';
import { PUBLIC_WHATSAPP_LINK } from './public-whatsapp';

@Component({
  selector: 'app-disease-detail',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent],
  templateUrl: './disease-detail.component.html'
})
export class DiseaseDetailComponent implements OnInit {
  readonly whatsappLink = PUBLIC_WHATSAPP_LINK;
  readonly defaultWarning =
    'This service is not for emergency care. For severe, sudden, or rapidly worsening symptoms, seek immediate offline medical help.';
  readonly disease = signal<DiseaseInfo | undefined>(undefined);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly overlayService: AppOverlayService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      this.disease.set(diseaseInfos.find((item) => item.slug === slug));
      window.scrollTo(0, 0);
    });
  }

  openAuthOverlay(event: Event, mode: 'patient' | 'staff' = 'patient') {
    openPublicAuthOverlay(this.overlayService, event, mode);
  }
}
