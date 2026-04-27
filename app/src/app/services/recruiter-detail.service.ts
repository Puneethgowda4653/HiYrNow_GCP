import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class RecruiterDetailService {
  url: string;

  constructor() {
    this.url = environment.apiUrl + '/api/recruiter';
  }

  findRecruiterDetailsByUserId() {
    return fetch(this.url + '/user', {
      credentials: 'include',
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  findRecruiterDetailsBySpecificUserId(userId: string) {
    return fetch(this.url + '/user/' + userId, {
      credentials: 'include',
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  updateRecruiterDetail(
    recruiterId: string,
    recruiter: { title: string; company: string }
  ) {
    // console.log(JSON.stringify(user));
    return fetch(this.url + '/' + recruiterId, {
      method: 'PUT',
      body: JSON.stringify(recruiter),
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
    }).then((response) => {
      return response.json();
    });
  }

  createRecruiterDetail(recruiterDetail: any) {
    // console.log(JSON.stringify(user));
    return fetch(this.url, {
      method: 'POST',
      body: JSON.stringify(recruiterDetail),
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
    }).then((response) => {
      return response.json();
    });
  }

  deleteRecruiterDetail(Id: string) {
    return fetch(this.url + '/' + Id, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  getDashboardData() {
    return fetch(this.url + '/dashboard', {
      credentials: 'include',
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }
}
