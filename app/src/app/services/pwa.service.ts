import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private promptEventSubject = new BehaviorSubject<BeforeInstallPromptEvent | null>(null);
  public promptEvent$ = this.promptEventSubject.asObservable();

  private isInstalledSubject = new BehaviorSubject<boolean>(this.checkIfInstalled());
  public isInstalled$ = this.isInstalledSubject.asObservable();

  constructor(
    private swUpdate: SwUpdate,
    private toastr: ToastrService
  ) {
    this.initializeBeforeInstallPrompt();
    this.initializeServiceWorkerUpdates();
    this.checkInstallation();
  }

  /**
   * Initialize beforeinstallprompt event listener
   */
  private initializeBeforeInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.promptEventSubject.next(this.deferredPrompt);
      console.log('PWA: beforeinstallprompt event captured');
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA: App successfully installed');
      this.deferredPrompt = null;
      this.promptEventSubject.next(null);
      this.isInstalledSubject.next(true);
      this.toastr.success('HiYrNow installed successfully!', 'Installation Complete');
    });
  }

  /**
   * Initialize service worker update checks
   */
  private initializeServiceWorkerUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('PWA: Service Worker updates not enabled');
      return;
    }

    // Check for updates on initialization
    this.swUpdate.checkForUpdate().then(() => {
      console.log('PWA: Checked for updates');
    }).catch(err => {
      console.error('PWA: Error checking for updates', err);
    });

    // Listen for version updates
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(event => {
        console.log('PWA: New version available', event);
        this.promptForUpdate();
      });

    // Check for updates periodically (every 6 hours)
    if (this.swUpdate.isEnabled) {
      setInterval(() => {
        this.swUpdate.checkForUpdate();
      }, 6 * 60 * 60 * 1000);
    }
  }

  /**
   * Check if app is installed
   */
  private checkIfInstalled(): boolean {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    return isStandalone || isIOSStandalone;
  }

  /**
   * Check installation status and update observable
   */
  private checkInstallation(): void {
    // Check on load
    this.isInstalledSubject.next(this.checkIfInstalled());

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isInstalledSubject.next(e.matches);
    });
  }

  /**
   * Trigger the PWA install prompt
   */
  async installPwa(): Promise<void> {
    if (!this.deferredPrompt) {
      console.log('PWA: No install prompt available');
      this.toastr.info('Installation not available on this device', 'Install');
      return;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      console.log('PWA: User choice:', choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        this.toastr.success('Installing HiYrNow...', 'Installing');
      } else {
        this.toastr.info('Installation cancelled', 'Cancelled');
      }
      
      this.deferredPrompt = null;
      this.promptEventSubject.next(null);
    } catch (error) {
      console.error('PWA: Error showing install prompt', error);
      this.toastr.error('Unable to show install prompt', 'Error');
    }
  }

  /**
   * Dismiss the install prompt
   */
  dismissPrompt(): void {
    this.promptEventSubject.next(null);
    // Keep deferredPrompt in case user wants to install later
    
    // Set a flag to not show again for 7 days
    const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('pwa-install-dismissed-until', dismissedUntil.toString());
  }

  /**
   * Check if install prompt should be shown
   */
  shouldShowInstallPrompt(): boolean {
    if (this.checkIfInstalled()) {
      return false;
    }

    const dismissedUntil = localStorage.getItem('pwa-install-dismissed-until');
    if (dismissedUntil) {
      const timestamp = parseInt(dismissedUntil, 10);
      if (Date.now() < timestamp) {
        return false;
      }
    }

    return !!this.deferredPrompt;
  }

  /**
   * Prompt user to reload for updates
   */
  private promptForUpdate(): void {
    this.toastr.info(
      'A new version is available. Click to update.',
      'Update Available',
      {
        timeOut: 0,
        closeButton: true,
        tapToDismiss: false
      }
    ).onTap.subscribe(() => {
      this.activateUpdate();
    });
  }

  /**
   * Activate the pending update
   */
  async activateUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    try {
      await this.swUpdate.activateUpdate();
      this.toastr.info('Reloading app with new version...', 'Updating');
      // Reload the page to apply updates
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('PWA: Error activating update', error);
      this.toastr.error('Failed to activate update', 'Error');
    }
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return false;
    }

    try {
      return await this.swUpdate.checkForUpdate();
    } catch (error) {
      console.error('PWA: Error checking for updates', error);
      return false;
    }
  }

  /**
   * Get installation status
   */
  isInstalled(): boolean {
    return this.isInstalledSubject.value;
  }

  /**
   * Get deferredPrompt availability
   */
  canInstall(): boolean {
    return !!this.deferredPrompt;
  }
}

