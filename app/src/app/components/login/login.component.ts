import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { UiModule } from '../../ui/ui.module';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms ease-in',
          style({ opacity: 0, transform: 'translateY(-10px)' })
        ),
      ]),
    ]),
  ],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  showPassword = false;
  isLoading = false;
  role: 'jobseeker' | 'recruiter' | null = null;
  rememberMe = false;
  attemptedSignIns = 0; // Track failed attempts for security warning

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      identifier: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  ngOnInit() {
  this.route.queryParams.subscribe(params => {
    this.role = params['role'] || null;
    
    // Handle Google OAuth success redirect
    const userId = params['userId'];
    const googleRole = params['role'];
    if (userId && googleRole) {
      // Call backend with the userId to establish session
      this.userService.findLoggedUser().then((response) => {
        if (response && response._id) {
          // Session exists - navigate to dashboard
          const roleRoutes: any = {
            JobSeeker: ['/dashboard-seeker'],
            Admin: ['/admin'],
            Recruiter: ['/company/dashboard'],
          };
          const route = roleRoutes[googleRole] || ['/home'];
          this.router.navigate(route);
        } else {
          // Session not ready yet - retry after delay
          setTimeout(() => {
            this.userService.findLoggedUser().then((retryResponse) => {
              if (retryResponse && retryResponse._id) {
                const roleRoutes: any = {
                  JobSeeker: ['/dashboard-seeker'],
                  Admin: ['/admin'],
                  Recruiter: ['/company/dashboard'],
                };
                const route = roleRoutes[googleRole] || ['/home'];
                this.router.navigate(route);
              } else {
                this.toastr.error('Login failed. Please try again.');
                this.router.navigate(['/login']);
              }
            });
          }, 1000);
        }
      });
    }
  });
}

  async login() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { identifier, password } = this.loginForm.value;

      try {
        const obj = await this.userService.login(identifier, password);

        if (obj.status === 'success') {
          // this.toastr.success('Welcome back!', '', {
          //   positionClass: 'toast-top-right',
          //   timeOut: 2000,
          // });

          // Navigate based on user role
          const roleRoutes = {
            JobSeeker: ['dashboard-seeker'],
            Admin: ['admin'],
            Recruiter: ['company/dashboard'],
          };

          const route = roleRoutes[obj.role as keyof typeof roleRoutes];
          if (route) {
            await this.router.navigate(route);
          }
        } else {
          this.attemptedSignIns++;
          const errorMessages = {
            'user does not exist':
              'User does not exist. Please check your credentials.',
            'Invalid password': 'Incorrect password. Please try again.',
            'Recruiter verification pending':
              'Your account is pending verification.',
          };

          const message =
            errorMessages[obj.status as keyof typeof errorMessages] ||
            'An unexpected error occurred. Please try again.';

          this.toastr.error(message);
          this.errorMessage = message;
        }
      } catch (error) {
        console.error('Login error:', error);
        this.toastr.error(
          'Unable to connect to the server. Please try again later.'
        );
        this.errorMessage =
          'Connection error. Please check your internet connection.';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.toastr.warning('Please fill in all required fields correctly.');
      this.loginForm.markAllAsTouched();
    }
  }

  async googleLogin() {
    try {
      this.isLoading = true;
      await this.userService.googleLogin();
    } catch (error) {
      console.error('Google login error:', error);
      this.toastr.error('Unable to login with Google. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  getRoleTitle(): string {
    if (this.role === 'recruiter') return 'Recruiter';
    if (this.role === 'jobseeker') return 'Jobseeker';
    return 'User';
  }

  getRoleDescription(): string {
    if (this.role === 'recruiter') return 'Access your recruiter dashboard';
    if (this.role === 'jobseeker') return 'Access your job seeker dashboard';
    return 'Access your account';
  }

  goToRoleSelector() {
    this.router.navigate(['/role-selector']);
  }

  goToRegister() {
    this.router.navigate(['/register'], { 
      queryParams: { role: this.role } 
    });
  }
}
