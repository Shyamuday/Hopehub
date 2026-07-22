import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-quick-access',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './quick-access.component.html',
  styleUrl: './quick-access.component.scss'
})
export class QuickAccessComponent {
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