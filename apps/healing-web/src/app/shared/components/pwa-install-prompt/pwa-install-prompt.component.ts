import { Component, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PWAService, PWAInstallPrompt } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [],
  templateUrl: './pwa-install-prompt.component.html',
  styleUrl: './pwa-install-prompt.component.scss'
})
export class PWAInstallPromptComponent implements OnInit {
  installPrompt = signal<PWAInstallPrompt | null>(null);
  showPrompt = signal(false);

  constructor(private pwaService: PWAService) {
    // Wait a bit before showing the prompt to avoid being intrusive
    setTimeout(() => {
      this.pwaService.installPrompt$
        .pipe(takeUntilDestroyed())
        .subscribe((prompt: PWAInstallPrompt | null) => {
          this.installPrompt.set(prompt);
          this.showPrompt.set(prompt !== null && this.pwaService.shouldShowInstallPrompt());
        });
    }, 3000); // Show after 3 seconds
  }

  ngOnInit(): void {
    // Component initialization if needed
  }

  async install(): Promise<void> {
    if (this.installPrompt()) {
      await this.installPrompt()!.install();
      this.showPrompt.set(false);
    }
  }

  dismiss(): void {
    if (this.installPrompt()) {
      this.installPrompt()!.dismiss();
    }
    this.showPrompt.set(false);
  }
}