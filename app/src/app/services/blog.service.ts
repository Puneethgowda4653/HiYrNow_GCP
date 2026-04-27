import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  // private apiUrl = `${environment.apiUrl}/api/blogs`;
  apiUrl: string;
  constructor(private http: HttpClient) {
    let base;
    if (!location.toString().includes('localhost')) {
      base = 'https://hiyrnow-backend-786443796056.europe-west1.run.app';
    } else {
      base = environment.apiUrl;
    }
    this.apiUrl = base + '/api/blogs';
  }

  getAllBlogs(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { withCredentials: true });
  }

  getBlogById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }


  createBlog(blogData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, blogData, { withCredentials: true });
  }

  updateBlog(id: string, blogData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, blogData, { withCredentials: true });
  }

  deleteBlog(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }
}
