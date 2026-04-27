import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { OfflineQueueService, SyncStatus } from '../../services/offline-queue.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-offline-page',
  templateUrl: './offline-page.component.html',
  styleUrls: ['./offline-page.component.css']
})
export class OfflinePageComponent implements OnInit, OnDestroy {
  isOnline: boolean = navigator.onLine;
  syncStatus?: SyncStatus;
  private subscription?: Subscription;

  constructor(
    private offlineQueue: OfflineQueueService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscription = this.offlineQueue.syncStatus$.subscribe(status => {
      this.syncStatus = status;
      this.isOnline = status.isOnline;
      
      // Auto-redirect when back online
      if (this.isOnline) {
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      }
    });

    // Initial status check
    this.loadSyncStatus();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async loadSyncStatus(): Promise<void> {
    this.syncStatus = await this.offlineQueue.getSyncStatus();
  }

  retry(): void {
    window.location.reload();
  }

  goToSavedJobs(): void {
    // Navigate to saved/cached jobs
    this.router.navigate(['/job-board']);
  }
}

