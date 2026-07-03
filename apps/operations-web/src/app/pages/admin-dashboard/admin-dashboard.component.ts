import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  template: `
    <section class="page-card">
      <h1>Admin overview</h1>
      <p>
        Staff operations are unified here. For the full platform console (catalog, audit, analytics),
        open the dedicated admin app.
      </p>
      <a class="btn" href="http://localhost:4201" target="_blank" rel="noopener">Open full admin console ↗</a>
    </section>
  `,
  styles: `
    .page-card { padding: 1.5rem; max-width: 40rem; }
    h1 { margin: 0 0 0.75rem; font-size: 1.35rem; }
    p { margin: 0 0 1rem; color: #4b5563; line-height: 1.5; }
    .btn {
      display: inline-block;
      padding: 0.6rem 1rem;
      border-radius: 0.5rem;
      background: #0f766e;
      color: #fff;
      text-decoration: none;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager
})
export class AdminDashboardComponent {}
