import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AppOverlayService } from '../overlay.service';
import { AuthFormOverlayComponent } from './auth-form-overlay.component';
import { HomeComponent } from '../home.component';

@Component({
  selector: 'app-login-page',
  imports: [HomeComponent],
  template: `<app-home />`,
})
export class LoginPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly overlayService = inject(AppOverlayService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    // If already authenticated, redirect to their dashboard immediately
    const user = this.auth.user();
    if (user) {
      void this.router.navigateByUrl(this.auth.dashboardFor(user.role), { replaceUrl: true });
      return;
    }

    // Open the auth overlay automatically
    const ref = this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel',
    });

    // After overlay closes (dismissed without login), navigate back or go home
    ref.afterClosed().subscribe(() => {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      if (this.auth.user()) {
        // User logged in — let the overlay handle navigation
        return;
      }
      // User dismissed without logging in — go home
      void this.router.navigate([returnUrl ? '/' : '/'], { replaceUrl: true });
    });
  }
}
