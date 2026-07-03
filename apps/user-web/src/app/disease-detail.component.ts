import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { diseaseInfos } from './disease/disease-info.constants';
import { DiseaseInfo } from './models';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-disease-detail',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent]
,
  templateUrl: './disease-detail.component.html',
})
export class DiseaseDetailComponent implements OnInit {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  readonly defaultWarning =
    'This service is not for emergency care. For severe, sudden, or rapidly worsening symptoms, seek immediate offline medical help.';
  readonly disease = signal<DiseaseInfo | undefined>(undefined);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly overlayService: AppOverlayService,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      this.disease.set(diseaseInfos.find((item) => item.slug === slug));
      window.scrollTo(0, 0);
    });
  }

  openAuthOverlay(event: Event) {
    event.preventDefault();
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel',
    });
  }
}
