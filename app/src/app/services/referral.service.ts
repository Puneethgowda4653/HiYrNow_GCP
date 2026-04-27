import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Referral {
  _id?: string;
  code: string;
  partnerName: string;
  email?: string;
  offerType: 'freePlan' | 'discount' | 'customFeatures';
  offerDetails: {
    freePlan?: string;
    durationDays?: number;
    discountPercent?: number;
    customFeatures?: any;
  };
  usageCount: number;
  maxUses: number;
  createdBy?: string;
  isActive: boolean;
  createdAt?: Date;
}

export interface ReferralAnalytics {
  totalActiveReferrals: number;
  totalRedemptions: number;
  topPartners: Array<{
    partnerName: string;
    code: string;
    usageCount: number;
    maxUses: number;
    utilizationRate: string;
  }>;
  referrals: Referral[];
}

export interface ReferralValidationResponse {
  status: string;
  message?: string;
  referral?: Referral;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReferralService {
  private baseUrl = environment.apiUrl || 'environment.apiUrl';

  constructor(private http: HttpClient) {}

  // Create a new referral code (Admin only)
  createReferral(referral: Partial<Referral>): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.baseUrl}/api/referrals/create`, referral, { 
      headers,
      withCredentials: true 
    });
  }

  // Get all referral codes (Admin view)
  getAllReferrals(): Observable<Referral[]> {
    return this.http.get<Referral[]>(`${this.baseUrl}/api/referrals`, {
      withCredentials: true
    });
  }

  // Get referral details by code
  getReferralByCode(code: string): Observable<ReferralValidationResponse> {
    return this.http.get<ReferralValidationResponse>(`${this.baseUrl}/api/referrals/${code}`, {
      withCredentials: true
    });
  }

  // Update referral offer or deactivate it
  updateReferral(id: string, referral: Partial<Referral>): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.put(`${this.baseUrl}/api/referrals/${id}`, referral, { 
      headers,
      withCredentials: true 
    });
  }

  // Delete referral code
  deleteReferral(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/referrals/${id}`, {
      withCredentials: true
    });
  }

  // Apply referral code during recruiter signup
  applyReferral(referralCode: string, userId: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post(`${this.baseUrl}/api/referrals/apply`, 
      { referralCode, userId }, 
      { 
        headers,
        withCredentials: true 
      }
    );
  }

  // Get referral analytics (Admin only)
  getReferralAnalytics(): Observable<ReferralAnalytics> {
    return this.http.get<ReferralAnalytics>(`${this.baseUrl}/api/referrals/analytics`, {
      withCredentials: true
    });
  }

  // Validate referral code (for signup form)
  validateReferralCode(code: string): Observable<ReferralValidationResponse> {
    return this.http.get<ReferralValidationResponse>(`${this.baseUrl}/api/referrals/${code}`, {
      withCredentials: true
    });
  }
}
