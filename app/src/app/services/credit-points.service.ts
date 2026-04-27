import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class CreditPointsService {
  baseUrl: string;

  constructor(private http: HttpClient) {
    let base;
    if (!location.toString().includes('localhost')) {
      base = 'https://hiyrnow-backend-786443796056.europe-west1.run.app';
    } else {
      base = environment.apiUrl;
    }
    this.baseUrl = base + '/api';
  }

  purchasePoints(amount: number): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/credits/purchase`,
      { amount },
      { withCredentials: true } // Add withCredentials here
    );
  }

  getBalance(): Observable<any> {
    return this.http.get(`${this.baseUrl}/credits/balance`, {
      withCredentials: true // Add withCredentials here
    });
  }

  getTransactions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/credits/transactions`, {
      withCredentials: true // Add withCredentials here
    });
  }

  deductPoints(feature: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/credits/deduct`,
      { feature },
      { withCredentials: true } // Add withCredentials here
    );
  }
}
