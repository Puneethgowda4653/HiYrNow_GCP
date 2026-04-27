import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExperienceService {

  url: string;

  constructor() {
    let base;
    if (!location.toString().includes('localhost')) {
      base = 'https://hiyrnow-backend-786443796056.europe-west1.run.app';
    } else {
      base = environment.apiUrl;
    }
    this.url = base + '/api/experience';
  }

  findExperienceByUserId() {
    return fetch(this.url + '/user', {
      credentials: 'include',
    }).then(response => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  updateExperience(experienceId: string, experience: { title: any; company: any; location: any; startDate: { month: string; year: string; }; endDate: { month: string; year: string; }; ongoingStatus: boolean; description: any; project: any, stacks: any }) {
    // console.log(JSON.stringify(user));
    return fetch(this.url + '/' + experienceId, {
      method: 'PUT',
      body: JSON.stringify(experience),
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      }
    }).then((response) => {
      return response.json();
    });
  }

  createExperience(experience: { title: any; company: any; location: any; startDate: { month: string; year: string; }; endDate: { month: string; year: string; }; ongoingStatus: boolean; description: any; project: any, stacks: any }) {
    // console.log(JSON.stringify(user));
    return fetch(this.url, {
      method: 'POST',
      body: JSON.stringify(experience),
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      }
    }).then((response) => {
      return response.json();
    });
  }

  deleteExperience(Id: string) {
    return fetch(this.url + '/' + Id, {
      method: 'DELETE',
      credentials: 'include'
    });
  }

}
