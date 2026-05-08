import { Component, type OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AppHeaderComponent } from '../app-header.component';
import { buildPatientWhatsAppLink } from '../patient/patient-whatsapp';
import { environment } from '../../environments/environment';
import { AppOverlayService } from '../overlay.service';
import { AuthFormOverlayComponent } from './auth-form-overlay.component';
import { supabase } from '../supabase.client';

@Component({
  selector: 'app-auth-reset-callback',
  imports: [AppHeaderComponent],
  template: `
    <div class="auth-reset-page">
      <app-header [subtitle]="subtitle" [whatsappLink]="whatsappLink" />
      <div class="reset-callback">
        <p>Processing reset link…</p>
      </div>
    </div>
  `,
  styles: [`
    .auth-reset-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .reset-callback {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
      color: #6b7280;
    }
  `]
})
export class AuthResetCallbackComponent implements OnInit {
  private readonly overlayService = inject(AppOverlayService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  get subtitle(): string {
    return this.translate.instant('common.digitalClinicTagline');
  }

  readonly whatsappLink = buildPatientWhatsAppLink(
    environment.patientExperience.whatsappE164,
    environment.patientExperience.whatsappMessage
  );

  async ngOnInit() {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const { data } = await supabase.auth.getSession();

    if (data.session) {
      this.overlayService.open(AuthFormOverlayComponent, {
        data: { mode: 'patient', initialForgotStep: 'reset' },
        width: '480px',
        panelClass: 'app-overlay-panel'
      });
      void this.router.navigateByUrl('/');
    } else {
      void this.router.navigateByUrl('/');
    }
  }
}
