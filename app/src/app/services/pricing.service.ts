// pricing.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface PricingRequest {
  points: number;
  industry: string;
  position: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  requirements?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PricingService {
  // private apiUrl = environment.apiUrl;
  url: string;
  constructor(private http: HttpClient){
    let base;
    if (!location.toString().includes('localhost')) {
      base = 'https://hiyrnow-v1-721026586154.europe-west1.run.app';
    } else {
      base = environment.apiUrl;
    }
    this.url = base ;
  }

  submitRequest(requestData: PricingRequest): Observable<any> {
    return this.http.post(`${this.url}/api/submit-request`, requestData);
  }

  submitCustomRequest(requestData: PricingRequest): Observable<any> {
    return this.http.post(`${this.url}/api/submit-custom-request`, requestData);
  }
}