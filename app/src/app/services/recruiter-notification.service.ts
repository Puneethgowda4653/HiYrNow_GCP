import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
export interface Notification {
  id: string;
  recipient: string;
  type: 'email' | 'whatsapp' | 'in-app';
  title: string;
  message: string;
  status: 'sent' | 'pending' | 'failed';
  createdAt: Date;
}

export interface BulkNotificationRequest {
  recipientIds: string[];
  type: 'email' | 'whatsapp' | 'in-app';
  title: string;
  message: string;
  jobId?: string;
}

export interface NotificationAction {
  applicationId: string;
  action: 'shortlisted' | 'rejected' | 'hired' | 'interview' | 'offer';
  message?: string;
  sendNotification: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RecruiterNotificationService {
  private baseUrl: string;

  constructor(private http: HttpClient) {
    this.baseUrl = location.toString().includes('localhost')
      ? 'environment.apiUrl'
      : environment.apiUrl;
  }

  /**
   * Send a notification to a single candidate
   */
  sendNotification(request: {
    recipientId: string;
    type: 'email' | 'whatsapp' | 'in-app';
    title: string;
    message: string;
    jobId?: string;
  }): Observable<Notification> {
    return this.http.post<Notification>(
      `${this.baseUrl}/api/recruiter/notifications`,
      request
    );
  }

  /**
   * Send bulk notifications to multiple candidates
   */
  sendBulkNotification(
    request: BulkNotificationRequest
  ): Observable<{ sent: number; failed: number }> {
    return this.http.post<{ sent: number; failed: number }>(
      `${this.baseUrl}/api/recruiter/notifications/bulk`,
      request
    );
  }

  /**
   * Send an action-triggered notification
   * (e.g., when shortlisting, rejecting, hiring a candidate)
   */
  sendActionNotification(action: NotificationAction): Observable<Notification> {
    return this.http.post<Notification>(
      `${this.baseUrl}/api/recruiter/applications/action-notification`,
      action
    );
  }

  /**
   * Get notification history for a job
   */
  getNotificationHistory(jobId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(
      `${this.baseUrl}/api/recruiter/notifications/job/${jobId}`
    );
  }

  /**
   * Get notification templates
   */
  getNotificationTemplates(): Observable<
    Array<{ id: string; title: string; message: string; type: string }>
  > {
    return this.http.get<
      Array<{ id: string; title: string; message: string; type: string }>
    >(`${this.baseUrl}/api/recruiter/notifications/templates`);
  }
}

