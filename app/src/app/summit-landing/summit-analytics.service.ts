import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SummitAnalyticsService {
  /**
   * Lightweight event tracking stub.
   * In production, wire this up to your real analytics provider.
   */
  trackEvent(name: string, payload?: any): void {
    // eslint-disable-next-line no-console
    console.debug('[SummitAnalytics]', name, payload || {});
  }

  /**
   * Hashes an email before sending it to analytics using SHA-256.
   * This avoids sending raw PII to downstream tools.
   */
  async hashEmail(email: string): Promise<string> {
    if (!email) {
      return '';
    }
    const data = new TextEncoder().encode(email.toLowerCase().trim());
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async trackSummitSignupSuccess(
    email: string | null | undefined,
    campaign?: string
  ): Promise<void> {
    const hashed = email ? await this.hashEmail(email) : '';
    this.trackEvent('summit_signup_success', {
      email_hash: hashed,
      campaign,
    });
  }
}


