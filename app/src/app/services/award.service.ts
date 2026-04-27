// app/../../services/award.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AwardService {

  url: string;

  constructor() {
    this.url = environment.apiUrl + '/api/award';
  }

  createAward(award: any) {
    return fetch(this.url, {
      method: 'POST',
      body: JSON.stringify(award),
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      }
    }).then(response => {
      return response.json();
    });
  }

  findAwardByUserId(userId: string) {
    return fetch(this.url + `/${userId}`, {
      credentials: 'include',
    }).then(response => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  updateAward(awardId: string, award: any) {
    return fetch(this.url + '/' + awardId, {
      method: 'PUT',
      body: JSON.stringify(award),
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      }
    }).then(response => {
      return response.json();
    });
  }

  deleteAward(awardId: string) {
    return fetch(this.url + '/' + awardId, {
      method: 'DELETE',
      credentials: 'include'
    });
  }
}
