// app/../../services/skill.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class SkillService {

  url: string;

  constructor() {
    let base;
    if (!location.toString().includes('localhost')) {
      base = 'https://hiyrnow-v1-721026586154.europe-west1.run.app';
    } else {
      base = environment.apiUrl;
    }
    this.url = base + '/api/skill';
  }

  findAllSkills() {
    return fetch(this.url, {
      credentials: 'include',
    }).then(response => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  findSkillByUserId() {
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

  createSkill(skill: {skillName:any; skillLevel:any;}) {
    return fetch(this.url, {
      method: 'POST',
      body: JSON.stringify(skill),
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      }
    }).then(response => {
      return response.json();
    });
  }

  updateSkill(skillId: string, skill: {skillName:any; skillLevel:any;}) {
    return fetch(this.url + '/' + skillId, {
      method: 'PUT',
      body: JSON.stringify(skill),
      credentials: 'include',
      headers: {
        'content-type': 'application/json'
      }
    }).then(response => {
      return response.json();
    });
  }

  deleteSkill(skillId: string) {
    return fetch(this.url + '/' + skillId, {
      method: 'DELETE',
      credentials: 'include'
    });
  }
}
