import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-role-selector',
  standalone: false,
  templateUrl: './role-selector.component.html',
  styleUrls: ['./role-selector.component.css']
})
export class RoleSelectorComponent {
  constructor(private router: Router) {}

  onRoleSelected(role: 'jobseeker' | 'recruiter') {
    // For recruiters, go directly to registration form (skip social login options)
    // For jobseekers, show auth options (can add social login later if needed)
    if (role === 'recruiter') {
      this.router.navigate(['/register/recruiter'], { 
        queryParams: { role } 
      });
    } else {
      // Jobseekers can still use auth options for now
      this.router.navigate(['/auth-options'], { 
        queryParams: { role } 
      });
    }
  }
}

