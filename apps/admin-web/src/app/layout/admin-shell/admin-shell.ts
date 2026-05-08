import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ADMIN_PERMISSIONS, adminHasAllPermissions, adminHasAnyPermission } from '../../core/admin-permissions';
import { AdminAuth } from '../../core/services/admin-auth';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss'
})
export class AdminShell {
  readonly auth = inject(AdminAuth);
  readonly P = ADMIN_PERMISSIONS;

  constructor(private readonly router: Router) {}

  canAll(...codes: string[]) {
    return adminHasAllPermissions(this.auth.user(), ...codes);
  }

  canAny(...codes: string[]) {
    return adminHasAnyPermission(this.auth.user(), ...codes);
  }

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
