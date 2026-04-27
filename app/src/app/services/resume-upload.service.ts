import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ResumeUploadService {

  public url: string;

  constructor(private http: HttpClient) {
    if (!location.toString().includes('localhost')) {
      this.url = 'https://hiyrnow-backend-786443796056.europe-west1.run.app/api';
    } else {
      this.url = '/api';  // proxy handles forwarding to localhost:5500
    }
  }

  downloadPDF(filename: string): Observable<Blob> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get(`${this.url}/file/${filename}`, {
      responseType: 'blob',
      headers: headers,
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  showFileNames(): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get(`${this.url}/files`, {
      headers: headers,
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  uploadFile(formData: FormData): Observable<any> {
    return this.http.post(`${this.url}/upload`, formData, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  parseResume(): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get(`${this.url}/parse-resume`, {
      headers: headers,
      withCredentials: true
    });
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
    } else {
      console.error(`Backend returned code ${error.status}, body was: ${error.error}`);
    }
    return throwError('Something bad happened; please try again later.');
  }
}