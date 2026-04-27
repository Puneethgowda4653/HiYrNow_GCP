import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
export interface InitiatePaymentRequest {
  userId: string;
  planId: string;
  paymentMethod: 'upi' | 'dummy';
  upiId?: string;
  referralCode?: string;
}

export interface InitiatePaymentResponse {
  status: 'success' | 'failed';
  txnId: string;
  planId: string;
  message?: string;
}

export interface VerifyPaymentResponse {
  status: 'success' | 'failed';
  planId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private baseUrl: string;

  constructor(private http: HttpClient) {
    let base;
    if (!location.toString().includes('localhost')) {
      base = 'https://hiyrnow-backend-786443796056.europe-west1.run.app';
    } else {
      base = environment.apiUrl;
    }
    this.baseUrl = base + '/api';
  }

  initiate(body: InitiatePaymentRequest): Observable<InitiatePaymentResponse> {
    return this.http.post<InitiatePaymentResponse>(`${this.baseUrl}/payments/initiate`, body, { withCredentials: true });
  }

  verify(txnId: string, status: 'success' | 'failed'): Observable<VerifyPaymentResponse> {
    return this.http.post<VerifyPaymentResponse>(`${this.baseUrl}/payments/verify`, { txnId, status }, { withCredentials: true });
  }

  submitCustomPlan(form: { companyName: string; email: string; phone: string; message?: string; }) {
    return this.http.post(`${this.baseUrl}/plans/custom`, form);
  }
}


