import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CollegeNameService {
  private apiUrl = 'https://college-api-p2wx.onrender.com/api/colleges';

  constructor(private http: HttpClient) { }

  getColleges(): Observable<string[]> {
    return this.http.get<string[]>(this.apiUrl);
  }

}
