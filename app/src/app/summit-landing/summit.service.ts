import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, scan, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SummitRegisterPayload {
  name: string;
  workEmail: string;
  phone: string;
  companyName?: string;
  campaign?: string;
  utm_source?: string;
  referrer?: string;
}

export interface SummitRegisterResponse {
  ok: boolean;
  signupToken: string;
  nextUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SummitService {
  /**
   * NOTE: We intentionally use environment.summitApiBase for configurability.
   * If not set, we fall back to the relative /api/summit/register endpoint.
   * TODO: Wire summitApiBase to your production backend host in environment files.
   */
  private readonly baseUrl =
    (environment as any).summitApiBase || '/api/summit/register';

  constructor(private http: HttpClient) {}

  register(payload: SummitRegisterPayload): Observable<SummitRegisterResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    });

    return this.http
      .post<SummitRegisterResponse>(
        this.baseUrl,
        payload,
        { headers, withCredentials: true }
      )
      .pipe(
        // Retry once on network-level failures only, with a simple backoff.
        retryWhen((errors) =>
          errors.pipe(
            scan(
              (acc, error) => {
                if (error instanceof HttpErrorResponse && error.status === 0 && acc < 1) {
                  return acc + 1;
                }
                throw error;
              },
              0 as number
            ),
            switchMap((retryCount) => timer(retryCount === 1 ? 2000 : 0))
          )
        ),
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        })
      );
  }
}


