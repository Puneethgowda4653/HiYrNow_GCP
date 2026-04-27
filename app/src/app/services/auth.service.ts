import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser$ = new BehaviorSubject<any>(null);
  // ✅ AFTER
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Uses your EXISTING /api/profile endpoint — already works in your app
  checkSession(): Observable<any> {
    return from(
      fetch(`${this.baseUrl}/api/profile`, { credentials: 'include' })
        .then(res => res.json())
    ).pipe(
      tap(user => {
        if (user && user._id && !user.error) {
          this.currentUser$.next(user);
        } else {
          this.currentUser$.next(null);
        }
      })
    );
  }

  isLoggedIn(): boolean {
    return this.currentUser$.value !== null;
  }

  getUser(): any { return this.currentUser$.value; }
  getUser$(): Observable<any> { return this.currentUser$.asObservable(); }
  logout(): void { this.currentUser$.next(null); }
}