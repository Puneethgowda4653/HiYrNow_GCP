import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, from, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import * as localforage from 'localforage';
import { ToastrService } from 'ngx-toastr';

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  headers?: any;
  timestamp: number;
  retryCount: number;
  type: 'job-application' | 'profile-update' | 'other';
  metadata?: any;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  lastSyncTime?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineQueueService {
  private readonly QUEUE_STORE = 'offline-queue';
  private readonly SYNC_STATUS_KEY = 'sync-status';
  private readonly MAX_RETRY_COUNT = 3;
  
  private queueSubject = new Subject<QueuedRequest[]>();
  private syncStatusSubject = new Subject<SyncStatus>();
  
  public queue$ = this.queueSubject.asObservable();
  public syncStatus$ = this.syncStatusSubject.asObservable();
  
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  
  private queueStore: LocalForage;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {
    // Initialize localforage
    this.queueStore = localforage.createInstance({
      name: 'hiyrnow-pwa',
      storeName: this.QUEUE_STORE
    });
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Initialize and sync on startup
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.updateSyncStatus();
    if (this.isOnline) {
      this.syncQueue();
    }
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.toastr.info('Connection restored. Syncing pending requests...', 'Back Online');
    this.updateSyncStatus();
    this.syncQueue();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.toastr.warning('You are offline. Changes will be saved and synced when connection is restored.', 'Offline Mode');
    this.updateSyncStatus();
  }

  /**
   * Add a request to the offline queue
   */
  async addToQueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0
    };

    await this.queueStore.setItem(queuedRequest.id, queuedRequest);
    await this.updateSyncStatus();
    
    this.toastr.info('Saved offline. Will submit when connection is restored.', 'Saved Offline');
    
    return queuedRequest.id;
  }

  /**
   * Get all queued requests
   */
  async getQueue(): Promise<QueuedRequest[]> {
    const queue: QueuedRequest[] = [];
    await this.queueStore.iterate((value: QueuedRequest) => {
      queue.push(value);
    });
    return queue.sort((a, b) => a.timestamp - b.timestamp); // FIFO order
  }

  /**
   * Get queued requests by type
   */
  async getQueueByType(type: QueuedRequest['type']): Promise<QueuedRequest[]> {
    const allQueue = await this.getQueue();
    return allQueue.filter(req => req.type === type);
  }

  /**
   * Remove a request from the queue
   */
  async removeFromQueue(id: string): Promise<void> {
    await this.queueStore.removeItem(id);
    await this.updateSyncStatus();
  }

  /**
   * Clear all queued requests
   */
  async clearQueue(): Promise<void> {
    await this.queueStore.clear();
    await this.updateSyncStatus();
  }

  /**
   * Manually trigger queue sync
   */
  async syncQueue(): Promise<void> {
    if (!this.isOnline) {
      this.toastr.warning('Cannot sync while offline', 'Offline');
      return;
    }

    if (this.isSyncing) {
      this.toastr.info('Sync already in progress', 'Syncing');
      return;
    }

    this.isSyncing = true;
    await this.updateSyncStatus();

    const queue = await this.getQueue();
    
    if (queue.length === 0) {
      this.isSyncing = false;
      await this.updateSyncStatus();
      return;
    }

    this.toastr.info(`Syncing ${queue.length} pending request(s)...`, 'Syncing');

    let successCount = 0;
    let failureCount = 0;

    for (const request of queue) {
      try {
        await this.processRequest(request);
        await this.removeFromQueue(request.id);
        successCount++;
      } catch (error: any) {
        console.error('Failed to process request:', request, error);
        
        if (request.retryCount >= this.MAX_RETRY_COUNT) {
          this.toastr.error(
            `Failed to submit ${request.type} after ${this.MAX_RETRY_COUNT} retries. Removing from queue.`,
            'Sync Failed'
          );
          await this.removeFromQueue(request.id);
          failureCount++;
        } else {
          // Increment retry count
          request.retryCount++;
          await this.queueStore.setItem(request.id, request);
          failureCount++;
        }
      }
    }

    this.isSyncing = false;
    await this.updateSyncStatus();

    if (successCount > 0) {
      this.toastr.success(
        `Successfully synced ${successCount} request(s)`,
        'Sync Complete'
      );
    }

    if (failureCount > 0) {
      this.toastr.warning(
        `${failureCount} request(s) failed to sync. Will retry later.`,
        'Partial Sync'
      );
    }
  }

  /**
   * Process a single queued request
   */
  private async processRequest(request: QueuedRequest): Promise<any> {
    const headers = new HttpHeaders(request.headers || {});
    
    return this.http.request(request.method, request.url, {
      body: request.body,
      headers: headers
    }).toPromise();
  }

  /**
   * Update and broadcast sync status
   */
  private async updateSyncStatus(): Promise<void> {
    const queue = await this.getQueue();
    const status: SyncStatus = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueLength: queue.length,
      lastSyncTime: Date.now()
    };
    
    this.syncStatusSubject.next(status);
    this.queueSubject.next(queue);
  }

  /**
   * Generate unique ID for queued requests
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if we're currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const queue = await this.getQueue();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueLength: queue.length,
      lastSyncTime: Date.now()
    };
  }

  /**
   * Save job application for offline submission
   */
  async saveJobApplicationOffline(
    jobId: string,
    applicationData: any,
    apiUrl: string
  ): Promise<string> {
    const token = localStorage.getItem('token');
    
    return this.addToQueue({
      url: apiUrl,
      method: 'POST',
      body: applicationData,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      type: 'job-application',
      metadata: {
        jobId,
        jobTitle: applicationData.jobTitle || 'Unknown Job'
      }
    });
  }

  /**
   * Get pending job applications
   */
  async getPendingJobApplications(): Promise<QueuedRequest[]> {
    return this.getQueueByType('job-application');
  }
}

