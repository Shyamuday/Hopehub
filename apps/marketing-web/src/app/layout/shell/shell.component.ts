import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { RoleTaskGuideComponent } from '../../shared/role-task-guide/role-task-guide.component';
import { NotificationBellHost } from '../../shared/notification-bell-host/notification-bell-host';
import { HrAuthService } from '../../services/hr-auth.service';
import { NAV_ITEMS } from '../../core/constants/app-routes.constants';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RoleTaskGuideComponent, NotificationBellHost],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
    return 'Marketing Hub';
  }
}
