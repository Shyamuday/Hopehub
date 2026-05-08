import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuth } from '../../core/services/admin-auth';

@Component({
  selector: 'app-no-access',
  imports: [],
  template: `
    <section class="panel">
      <h2>No console access</h2>
      <p>
        Your admin login does not include any permissions for this console yet. Ask a super admin to assign a
        <strong>role preset</strong> or permission codes under <strong>Staff</strong>.
      </p>
      <button type="button" class="btn-signout" (click)="signOut()">Sign out</button>
    </section>
  `,
  styles: [
    `
      .panel {
        max-width: 32rem;
        margin: 2rem auto;
        padding: 1.5rem;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
      }
      p {
        line-height: 1.5;
        color: #475569;
      }
      button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        cursor: pointer;
      }
      .btn-signout {
        background: #1e293b;
        color: #fff;
        border-color: #1e293b;
      }
    `
  ]
})
export class NoAccessComponent {
  private readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);

  signOut() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
