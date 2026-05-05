import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuth } from '../../core/services/admin-auth';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss'
})
export class AdminShell {
  constructor(
    private readonly auth: AdminAuth,
    private readonly router: Router
  ) {}

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
