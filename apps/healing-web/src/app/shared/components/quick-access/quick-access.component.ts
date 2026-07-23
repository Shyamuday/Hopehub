import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../../core';

@Component({
  selector: 'app-quick-access',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './quick-access.component.html',
  styleUrl: './quick-access.component.scss',
})
export class QuickAccessComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
  isMenuOpen = signal(false);
  showCrisisModal = signal(false);

  toggleMenu() {
    this.isMenuOpen.update((value: boolean) => !value);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  showCrisisSupport() {
    this.showCrisisModal.set(true);
    this.closeMenu();
  }

  closeCrisisModal() {
    this.showCrisisModal.set(false);
  }
}
