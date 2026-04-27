import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
export interface PricingPlan {
  _id?: string;
  code: 'starter' | 'growth' | 'elite' | 'enterprise';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class PlanService {
  baseUrl: string;
  

  constructor(private http: HttpClient) {
    let base;
    if (!location.toString().includes('localhost')) {
      base = 'https://hiyrnow-v1-721026586154.europe-west1.run.app';
    } else {
      base = environment.apiUrl;
    }
    this.baseUrl = base + "/api";
  }

  getPlans(): Observable<PricingPlan[]> {
    return this.http.get<PricingPlan[]>(`${this.baseUrl}/plans`);
  }

  getPlan(code: string): Observable<PricingPlan> {
    return this.http.get<PricingPlan>(`${this.baseUrl}/plans/${code}`);
  }

  selectPlan(code: string, billingCycle: 'monthly' | 'yearly') {
    return this.http.post(`${this.baseUrl}/plans/select`, { code, billingCycle });
  }

  getUserPlanStatus(): Observable<UserPlanStatus> {
    return this.http.get<UserPlanStatus>(`${this.baseUrl}/plans/status`);
  }

  submitCustomPlanRequest(data: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    teamSize: string;
    requirements: string;
    interests: string[];
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/plans/custom-request`, data);
  }
}

export interface UserPlanStatus {
  currentPlan: string;
  usageStats: {
    jobPostings: { used: number; limit: number };
    aiToolsUsage: { used: number; limit: number };
    resumeViews: { used: number; limit: number };
    resumeParsing: { used: number; limit: number };
  };
  canUpgrade: boolean;
  canDowngrade: boolean;
}
