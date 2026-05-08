import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { pickFirstAllowedRoute } from '../../core/admin-navigation';
import { AdminAuth } from '../../core/services/admin-auth';

@Component({
  selector: 'app-admin-home-redirect',
  template: '<p class="redirect-msg">Loading your workspace…</p>',
  styles: [
    `
      .redirect-msg {
        padding: 1.25rem;
        color: #64748b;
        font-size: 0.9rem;
      }
    `
  ]
})
export class AdminHomeRedirectComponent implements OnInit {
  private readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);

  ngOnInit() {
    const path = pickFirstAllowedRoute(this.auth.user());
    void this.router.navigateByUrl(path ?? '/no-access', { replaceUrl: true });
  }
}
