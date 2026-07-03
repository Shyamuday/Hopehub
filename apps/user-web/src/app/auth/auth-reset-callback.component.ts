import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppOverlayService } from '../overlay.service';
import { AuthFormOverlayComponent } from './auth-form-overlay.component';

@Component({
  selector: 'app-auth-reset-callback',
  imports: [],
  templateUrl: './auth-reset-callback.component.html',
  styleUrl: './auth-reset-callback.component.scss',
})
export class AuthResetCallbackComponent implements OnInit {
  private readonly overlayService = inject(AppOverlayService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (token) {
      this.overlayService.open(AuthFormOverlayComponent, {
        data: { initialForgotStep: 'reset', resetToken: token },
        width: '480px',
        panelClass: 'app-overlay-panel',
      });
    }

    void this.router.navigateByUrl('/');
  }
}
