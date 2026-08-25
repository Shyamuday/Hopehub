import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  ngOnInit(): void {
    void this.openLoginWhenSessionIsReady();
  }

  private async openLoginWhenSessionIsReady(): Promise<void> {
    // Wait for a stored access/refresh session to be restored before deciding
    // whether the login UI is needed.
    const user = await this.auth.bootstrapSession();
    if (user) {
      await this.router.navigateByUrl(this.auth.dashboardFor(user.role), { replaceUrl: true });
      return;
    }

    // Open the auth overlay automatically
    const ref = this.overlayService.open(AuthFormOverlayComponent, {
      width: '440px',
      panelClass: 'app-overlay-panel',
    });

    // After overlay closes (dismissed without login), navigate back or go home
    ref.afterClosed().subscribe(() => {
      if (this.auth.user()) {
        // User logged in — let the overlay handle navigation
        return;
      }
      // User dismissed without logging in — go home
      void this.router.navigateByUrl('/', { replaceUrl: true });
    });
  }
}
