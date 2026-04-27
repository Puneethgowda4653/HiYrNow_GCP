import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SitemapService {
  private sitemapUrl = 'https://hiyrnow-backend-786443796056.europe-west1.run.app/sitemap.xml'; // Your sitemap endpoint

  constructor(private http: HttpClient) { }

  getSitemap(): Observable<string> {
    return this.http.get(this.sitemapUrl, { responseType: 'text' });
  }
}
