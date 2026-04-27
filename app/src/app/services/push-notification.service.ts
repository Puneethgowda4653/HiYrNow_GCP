import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private readonly FCM_ENABLED = environment.fcm?.enabled || false;
  private readonly VAPID_PUBLIC_KEY = environment.fcm?.vapidPublicKey || '';
  private readonly API_URL = environment.apiUrl || 'https://hiyrnow-backend-786443796056.europe-west1.run.app/api';

  constructor(
    private swPush: SwPush,
    private http: HttpClient,
    private toastr: ToastrService
  ) {
    if (this.FCM_ENABLED && this.swPush.isEnabled) {
      this.initializePushNotifications();
    } else if (!this.FCM_ENABLED) {
      console.log('FCM: Push notifications are disabled via feature flag');
    }
  }

  /**
   * Initialize push notifications
   */
  private initializePushNotifications(): void {
    // Listen for push messages
    this.swPush.messages.subscribe(message => {
      console.log('FCM: Push message received', message);
      this.handlePushMessage(message);
    });

    // Listen for notification clicks
    this.swPush.notificationClicks.subscribe(event => {
      console.log('FCM: Notification clicked', event);
      this.handleNotificationClick(event);
    });

    // Check for existing subscription
    this.swPush.subscription.subscribe(subscription => {
      console.log('FCM: Current subscription', subscription);
    });
  }

  /**
   * Request permission and subscribe to push notifications
   */
  async subscribeToNotifications(): Promise<boolean> {
    if (!this.FCM_ENABLED) {
      console.log('FCM: Push notifications are disabled');
      this.toastr.info('Push notifications are currently disabled', 'Info');
      return false;
    }

    if (!this.swPush.isEnabled) {
      console.log('FCM: Service worker not enabled');
      this.toastr.warning('Push notifications are not supported on this browser', 'Not Supported');
      return false;
    }

    if (!this.VAPID_PUBLIC_KEY) {
      console.error('FCM: VAPID public key not configured');
      this.toastr.error('Push notification configuration missing', 'Configuration Error');
      return false;
    }

    try {
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });

      console.log('FCM: Push subscription successful', subscription);

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);

      this.toastr.success('Push notifications enabled!', 'Success');
      return true;
    } catch (error) {
      console.error('FCM: Failed to subscribe to push notifications', error);
      this.toastr.error('Failed to enable push notifications', 'Error');
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.swPush.isEnabled) {
      return false;
    }

    try {
      const subscription = await this.swPush.subscription.toPromise();

      if (subscription) {
        await this.swPush.unsubscribe();

        // Notify backend about unsubscription
        await this.removeSubscriptionFromBackend(subscription);

        console.log('FCM: Unsubscribed from push notifications');
        this.toastr.success('Push notifications disabled', 'Success');
        return true;
      }

      return false;
    } catch (error) {
      console.error('FCM: Failed to unsubscribe from push notifications', error);
      this.toastr.error('Failed to disable push notifications', 'Error');
      return false;
    }
  }

  /**
   * Check if currently subscribed to push notifications
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.swPush.isEnabled) {
      return false;
    }

    try {
      const subscription = await this.swPush.subscription.toPromise();
      return !!subscription;
    } catch (error) {
      console.error('FCM: Error checking subscription status', error);
      return false;
    }
  }

  /**
   * Send subscription details to backend
   */
  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      if (!token || !userId) {
        console.warn('FCM: User not authenticated, skipping backend subscription');
        return;
      }

      await this.http.post(`${this.API_URL}/users/push-subscription`, {
        userId,
        subscription: subscription.toJSON()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).toPromise();

      console.log('FCM: Subscription saved to backend');
    } catch (error) {
      console.error('FCM: Failed to save subscription to backend', error);
      // Don't throw error - subscription still works locally
    }
  }

  /**
   * Remove subscription from backend
   */
  private async removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');

      if (!token || !userId) {
        return;
      }

      await this.http.delete(`${this.API_URL}/users/push-subscription`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: {
          userId,
          endpoint: subscription.endpoint
        }
      }).toPromise();

      console.log('FCM: Subscription removed from backend');
    } catch (error) {
      console.error('FCM: Failed to remove subscription from backend', error);
    }
  }

  /**
   * Handle incoming push message
   */
  private handlePushMessage(message: any): void {
    // Custom handling for push messages
    console.log('FCM: Processing push message', message);

    // You can add custom logic here based on message type
    const notification = message.notification || message.data;

    if (notification) {
      this.toastr.info(
        notification.body || 'You have a new notification',
        notification.title || 'Notification'
      );
    }
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(event: any): void {
    console.log('FCM: Notification clicked', event);

    // Handle navigation based on notification data
    if (event.notification?.data?.url) {
      window.open(event.notification.data.url, '_self');
    }
  }

  /**
   * Check if FCM is enabled
   */
  isFcmEnabled(): boolean {
    return this.FCM_ENABLED;
  }
}

