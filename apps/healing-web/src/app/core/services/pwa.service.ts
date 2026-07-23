import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface PWAInstallPrompt {
  canInstall: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
}

export interface PWAUpdateNotification {
  hasUpdate: boolean;
  update: () => Promise<void>;
  dismiss: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class PWAService {
  private deferredPrompt: any = null;
  private isBrowser: boolean;
  private installPromptSubject = new BehaviorSubject<PWAInstallPrompt | null>(null);
  private updateNotificationSubject = new BehaviorSubject<PWAUpdateNotification | null>(null);

  public installPrompt$ = this.installPromptSubject.asObservable();
  public updateNotification$ = this.updateNotificationSubject.asObservable();

  constructor(
    private swUpdate: SwUpdate,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initializePWA();
    }
  }

  private initializePWA(): void {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      this.installPromptSubject.next({
        canInstall: true,
        install: () => this.installApp(),
        dismiss: () => this.dismissInstallPrompt(),
      });
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('Hope Hub PWA was installed');
      this.deferredPrompt = null;
      this.installPromptSubject.next(null);

      // Track installation
      this.trackPWAInstall();
    });

    // Check for service worker updates
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          this.updateNotificationSubject.next({
            hasUpdate: true,
            update: () => this.updateApp(),
            dismiss: () => this.dismissUpdateNotification(),
          });
        });

      // Check for updates every 6 hours
      setInterval(
        () => {
          this.swUpdate.checkForUpdate();
        },
        6 * 60 * 60 * 1000,
      );
    }
  }

  private async installApp(): Promise<void> {
    if (!this.deferredPrompt) return;

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }

      this.deferredPrompt = null;
      this.installPromptSubject.next(null);
    } catch (error) {
      console.error('Error during app installation:', error);
    }
  }

  private dismissInstallPrompt(): void {
    this.installPromptSubject.next(null);
    // Store dismissal to avoid showing again for a while
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  }

  private async updateApp(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      if (this.isBrowser) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating app:', error);
    }
  }

  private dismissUpdateNotification(): void {
    this.updateNotificationSubject.next(null);
  }

  private trackPWAInstall(): void {
    // Track PWA installation for analytics
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      localStorage.setItem('pwa-installed', 'true');
      localStorage.setItem('pwa-install-date', new Date().toISOString());
    }
  }

  // Public methods
  public isPWAInstalled(): boolean {
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      return (
        localStorage.getItem('pwa-installed') === 'true' ||
        window.matchMedia('(display-mode: standalone)').matches
      );
    }
    return false;
  }

  public canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  public shouldShowInstallPrompt(): boolean {
    if (this.isPWAInstalled()) return false;

    if (this.isBrowser && typeof localStorage !== 'undefined') {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const daysSinceDismissal = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        return daysSinceDismissal > 7; // Show again after 7 days
      }
    }

    return this.canInstall();
  }

  public getInstallationDate(): Date | null {
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      const installDate = localStorage.getItem('pwa-install-date');
      return installDate ? new Date(installDate) : null;
    }
    return null;
  }

  // Check if running in standalone mode
  public isStandalone(): boolean {
    if (!this.isBrowser) return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  // Get PWA capabilities
  public getPWACapabilities(): {
    canInstall: boolean;
    isInstalled: boolean;
    isStandalone: boolean;
    hasServiceWorker: boolean;
    canReceiveNotifications: boolean;
  } {
    if (!this.isBrowser) {
      return {
        canInstall: false,
        isInstalled: false,
        isStandalone: false,
        hasServiceWorker: false,
        canReceiveNotifications: false,
      };
    }
    return {
      canInstall: this.canInstall(),
      isInstalled: this.isPWAInstalled(),
      isStandalone: this.isStandalone(),
      hasServiceWorker: 'serviceWorker' in navigator,
      canReceiveNotifications: 'Notification' in window,
    };
  }

  // Request notification permission for reminders
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!this.isBrowser || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  // Send local notification for mental health reminders
  public sendNotification(title: string, options?: NotificationOptions): void {
    if (this.isBrowser && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  // Schedule daily reminder notifications
  public scheduleDailyReminder(): void {
    if (this.isBrowser && Notification.permission === 'granted') {
      // This would typically use a more sophisticated scheduling system
      // For now, we'll set a simple timeout for demonstration
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM reminder

      const timeUntilReminder = tomorrow.getTime() - now.getTime();

      setTimeout(() => {
        this.sendNotification('Daily Mental Health Check-in', {
          body: 'Take a moment to check in with yourself. How are you feeling today?',
          tag: 'daily-reminder',
          requireInteraction: true,
        });
      }, timeUntilReminder);
    }
  }
}
