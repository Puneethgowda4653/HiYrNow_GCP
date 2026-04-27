import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = '/api/admin';
  constructor(private http: HttpClient) {
    let baseurl;
    if (!location.toString().includes('localhost')) {
      baseurl = 'https://hiyrnow-v1-721026586154.europe-west1.run.app';
    } else {
      baseurl = environment.apiUrl;
    }
    this.base = baseurl + '/api/admin';
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.base}/login`, { email, password }, { withCredentials: true });
    }

  logout(): Observable<any> { return this.http.post(`${this.base}/logout`, {}, { withCredentials: true }); }

  checkSession(): Observable<any> { return this.http.get(`${this.base}/session`, { withCredentials: true }); }

  getSummary(): Observable<any> { return this.http.get(`${this.base}/summary`, { withCredentials: true }); }

  getUsers(q: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(q || {}).forEach(k => { if (q[k] !== undefined && q[k] !== null && q[k] !== '') params = params.set(k, q[k]); });
    return this.http.get(`${this.base}/users`, { params, withCredentials: true });
  }
  updateUserStatus(id: string, status: string): Observable<any> { return this.http.patch(`${this.base}/users/${id}/status`, { status }, { withCredentials: true }); }

  getJobs(q: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(q || {}).forEach(k => { if (q[k] !== undefined && q[k] !== null && q[k] !== '') params = params.set(k, q[k]); });
    return this.http.get(`${this.base}/jobs`, { params, withCredentials: true });
  }
  updateJobStatus(id: string, status: string): Observable<any> { return this.http.patch(`${this.base}/jobs/${id}/status`, { status }, { withCredentials: true }); }

  getPlans(): Observable<any> { return this.http.get(`${this.base}/plans`, { withCredentials: true }); }
  createPlan(p: any): Observable<any> { return this.http.post(`${this.base}/plans`, p, { withCredentials: true }); }
  updatePlan(id: string, p: any): Observable<any> { return this.http.put(`${this.base}/plans/${id}`, p, { withCredentials: true }); }

  getReferrals(): Observable<any> { return this.http.get(`${this.base}/referrals`, { withCredentials: true }); }

  getAIAnalytics(): Observable<any> { return this.http.get(`${this.base}/analytics/ai`, { withCredentials: true }); }

  getLogs(): Observable<any> { return this.http.get(`${this.base}/logs`, { withCredentials: true }); }
}


