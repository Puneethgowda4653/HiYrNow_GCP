// services/filter.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class FilterService {
  // private url = '/api/filter';
  url: string;
  constructor(private http: HttpClient) {

  let base;
  if (!location.toString().includes('localhost')) {
    base = 'https://hiyrnow-v1-721026586154.europe-west1.run.app';
  } else {
    base = environment.apiUrl;
  }
  this.url = base + '/api/filter';
}


  createFilter(filter: any): Observable<any> {
    return this.http.post(`${this.url}`, filter,{ withCredentials: true});
  }

  getFilters(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}`,{ withCredentials: true});
  }

  deleteFilter(filterId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${filterId}`,{ withCredentials: true});
  }
}
