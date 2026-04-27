import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class JobListingService {

  private jobPortalBaseUrl = 'https://hiyrnow-v1-721026586154.europe-west1.run.app';

  constructor(private http: HttpClient) { }

  findAllJobs() {
    return this.http.get(this.jobPortalBaseUrl);
  }

  findFilteredJobs(location: string, keyword: string) {
    return this.http.get(this.jobPortalBaseUrl, {
      params: {
        description: keyword,
        location: location
      }
    });
  }

  findAllJobPortalJobs() {
    return this.http.get(this.jobPortalBaseUrl);
  }
}
