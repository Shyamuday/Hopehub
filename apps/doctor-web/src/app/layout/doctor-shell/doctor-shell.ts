import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-doctor-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './doctor-shell.html',
  styleUrl: './doctor-shell.scss',
})
export class DoctorShell {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
