import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocialProvider } from '../../ui/socialButton/social-button.component';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-auth-options',
  standalone: false,
  templateUrl: './auth-options.component.html',
  styleUrls: ['./auth-options.component.css']
})
export class AuthOptionsComponent implements OnInit {
  role: 'jobseeker' | 'recruiter' = 'jobseeker';
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.role = params['role'] || 'jobseeker';
    });
  }

  onSocialLogin(provider: SocialProvider) {
    this.isLoading = true;

    if (provider === 'google') {
      try {
        this.userService.googleLogin();
        // Note: googleLogin() redirects, so we don't need to handle success
        this.isLoading = false;
      } catch (error: any) {
        console.error('Google login error:', error);
        this.toastr.error('Failed to sign in with Google. Please try again.');
        this.isLoading = false;
      }
    } else if (provider === 'linkedin') {
      // TODO: Implement LinkedIn OAuth
      this.toastr.info('LinkedIn login coming soon!');
      this.isLoading = false;
    } else if (provider === 'email') {
      // Navigate to role-specific registration
      if (this.role === 'recruiter') {
        this.router.navigate(['/register/recruiter'], { 
          queryParams: { role: this.role } 
        });
      } else {
        this.router.navigate(['/register/jobseeker'], { 
          queryParams: { role: this.role } 
        });
      }
    }
  }

  goBack() {
    this.router.navigate(['/role-selector']);
  }

  goToLogin() {
    this.router.navigate(['/login'], { 
      queryParams: { role: this.role } 
    });
  }
}

