import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppOverlayService } from '../overlay.service';
import { AuthFormOverlayComponent } from './auth-form-overlay.component';
import { supabase } from '../supabase.client';

@Component({
  selector: 'app-auth-reset-callback',
  imports: [],
  template: `<div class="reset-callback"><p>Processing reset link…</p></div>`,
  styles: [`
    .reset-callback {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: inherit;
      color: #6b7280;
    }
  `]
})
export class AuthResetCallbackComponent implements OnInit {
  private readonly overlayService = inject(AppOverlayService);
  private readonly router = inject(Router);

  async ngOnInit() {
    // Give Supabase a moment to process the URL fragment
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
