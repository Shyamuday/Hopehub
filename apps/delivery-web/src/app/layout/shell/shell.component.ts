import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HrAuthService } from '../../services/hr-auth.service';
import { NAV_ITEMS } from '../../core/constants/app-routes.constants';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  auth = inject(HrAuthService);
  sidebarOpen = signal(false);

  navItems = NAV_ITEMS;

  userInitial() {
    const name = this.auth.currentUser()?.name ?? 'H';
    return name.charAt(0).toUpperCase();
  }

  pageTitle() {
    return 'Delivery Hub';
  }
}
