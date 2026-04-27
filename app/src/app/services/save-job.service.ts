import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class SaveJobService {

  private base: string;
  // ✅ AFTER
  private url: string = '';
  isJobSaved: any;

  constructor() {
    this.base = environment.apiUrl;
    this.url = `${this.base}/api/jobApplication`;
  }

  createJobApplication(jobApplication: { dateApplied: Date; status: string; jobSource: any; gitHubJobId: any; location: any; title: any; company: any; jobPosting?: undefined; } | { dateApplied: Date; status: string; jobSource: any; jobPosting: any; location: any; title: any; company: any; gitHubJobId?: undefined; }) {
  
    return fetch(this.url, {
      method: 'POST',
      body: JSON.stringify(jobApplication),
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      }
    }).then(response => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  updateJobApplication(jobApplicationId: string, jobApplication: any) {
    return fetch(`${this.url}/${jobApplicationId}`, {
      method: 'PUT',
      body: JSON.stringify(jobApplication),
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      }
    }).then(response => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  deleteJobApplication(jobApplicationId: string) {
    return fetch(`${this.url}/${jobApplicationId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
  }

  deleteJobApplicationByJobPosting(jobApplicationId: string, source: string) {
    return fetch(`${this.url}/${jobApplicationId}/${source}`, {
      method: 'DELETE',
      credentials: 'include'
    });
  }

  getAllJobApplicationForUser() {
    return fetch(this.url, {
      credentials: 'include'
    }).then(response => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  getAppliedUsersForJob(jobId: string, jobSource: string): Promise<any> {
  const apiUrl = `${this.base}/api/jobApplication/${jobId}/${encodeURIComponent(jobSource || 'HiYrNow')}/appliedUsers`;
    
    return fetch(apiUrl, {
      credentials: 'include'
    }).then(response => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }
}
