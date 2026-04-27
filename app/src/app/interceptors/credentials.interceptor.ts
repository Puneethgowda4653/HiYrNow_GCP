import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class CredentialsInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Only add credentials for API requests (not for external resources like fonts, CDNs)
    const isApiRequest = req.url.includes('/api') ||
      req.url.includes('localhost:5500') ||
      //req.url.includes('hiyrnow.in/backend');
      req.url.includes('hiyrnow-backend-786443796056.europe-west1.run.app')
    if (isApiRequest) {
      // Clone the request and add withCredentials
      const credentialReq = req.clone({
        withCredentials: true,
      });

      return next.handle(credentialReq);
    }

    // For non-API requests, proceed without modification
    return next.handle(req);
  }
}

