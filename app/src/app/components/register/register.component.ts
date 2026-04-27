import { Component, OnInit, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from './../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { trigger, transition, style, animate } from '@angular/animations';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '400ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  showPassword: boolean = false;
  submitting: boolean = false;
  registrationError: string = '';
  passwordStrength: number = 0;
  passwordStrengthText: string = '';
  darkMode: boolean = false;

  // Add this getter for template compatibility
  get loading() {
    return this.submitting;
  }

  // OTP Verification
  showOtpModal: boolean = false;
  otpForm: FormGroup;
  otpError: string = '';
  otpResendTimer: number = 60;
  canResendOtp: boolean = false;
  otpTimerInterval: any;

  constructor(
    private router: Router,
    private service: UserService,
    private toastr: ToastrService,
    private renderer: Renderer2,
    private fb: FormBuilder
  ) {
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        username: ['', [Validators.required, Validators.minLength(3)]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
            ),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
        acceptTerms: [false, [Validators.requiredTrue]],
      },
      { validator: this.passwordMatchValidator }
    );

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  ngOnInit() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.darkMode = true;
      this.applyDarkMode();
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  get email() {
    return this.registerForm.get('email');
  }
  get username() {
    return this.registerForm.get('username');
  }
  get password() {
    return this.registerForm.get('password');
  }
  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }
  get acceptTerms() {
    return this.registerForm.get('acceptTerms');
  }

  isEmailInvalid() {
    return this.email?.invalid && (this.email?.dirty || this.email?.touched);
  }

  isUsernameInvalid() {
    return (
      this.username?.invalid && (this.username?.dirty || this.username?.touched)
    );
  }

  isPasswordInvalid() {
    return (
      this.password?.invalid && (this.password?.dirty || this.password?.touched)
    );
  }

  isConfirmPasswordInvalid() {
    return (
      this.confirmPassword?.invalid &&
      (this.confirmPassword?.dirty || this.confirmPassword?.touched)
    );
  }

  calculatePasswordStrength() {
    const password = this.password?.value;
    if (!password) {
      this.passwordStrength = 0;
      this.passwordStrengthText = '';
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    this.passwordStrength = strength;
    this.passwordStrengthText = this.getPasswordStrengthText(strength);
  }

  getPasswordStrengthText(strength: number): string {
    switch (strength) {
      case 1:
        return 'Very Weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Medium';
      case 4:
        return 'Strong';
      case 5:
        return 'Very Strong';
      default:
        return '';
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.toastr.warning('Please fill in all required fields correctly');
      return;
    }

    this.submitting = true;
    const { email, username, password } = this.registerForm.value;

    this.service
      .register({ email, username, password, role: 'JobSeeker' })
      .then((res) => {
        if (res.status === true) {
          this.toastr.success('Welcome to the squad! 🎉', undefined, {
            progressBar: true,
            closeButton: true,
          });
          this.showConfetti();
          this.router.navigate(['/onboarding']);
          // this.showOtpModal = true;
          // this.startOtpTimer();
          // this.toastr.info('Please check your email for the OTP code');
        } else {
          this.registrationError =
            'Username already exists. Try something unique!';
          this.toastr.error(this.registrationError);
        }
      })
      .catch((error) => {
        console.error('Registration error:', error);
        this.registrationError =
          'Oops! Something went wrong. Please try again.';
        this.toastr.error(this.registrationError);
      })
      .finally(() => {
        this.submitting = false;
      });
  }

  googleLogin() {
    this.service.googleLogin();
  }

  toggleTheme() {
    this.darkMode = !this.darkMode;
    if (this.darkMode) {
      this.applyDarkMode();
      localStorage.setItem('theme', 'dark');
    } else {
      this.removeDarkMode();
      localStorage.setItem('theme', 'light');
    }
  }

  applyDarkMode() {
    document.documentElement.classList.add('dark');
  }

  removeDarkMode() {
    document.documentElement.classList.remove('dark');
  }

  showConfetti() {
    // This is a placeholder for confetti effect
    console.log('Confetti celebration!');
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  // OTP Verification Methods
  verifyOtp() {
    if (this.otpForm.invalid) {
      this.otpError = 'Please enter a valid 6-digit OTP code';
      return;
    }

    const { email } = this.registerForm.value;
    const { otp } = this.otpForm.value;

    this.service.verifyOTP(email, otp).subscribe({
      next: (response) => {
        if (response && response.message === 'OTP verified successfully') {
          this.toastr.success('Welcome to the squad! 🎉', undefined, {
            progressBar: true,
            closeButton: true,
          });
          this.showConfetti();
          this.router.navigate(['/onboarding']);
        } else {
          this.otpError = 'Invalid OTP code. Please try again.';
        }
      },
      error: (error: Error) => {
        console.error('OTP verification error:', error);
        this.otpError = 'Something went wrong. Please try again.';
      },
    });
  }

  resendOtp() {
    if (!this.canResendOtp) return;

    const { email } = this.registerForm.value;
    this.service.resendOTP(email).subscribe({
      next: (res: { status: boolean }) => {
        if (res.status === true) {
          this.toastr.info('New OTP code sent to your email');
          this.startOtpTimer();
        } else {
          this.toastr.error('Failed to resend OTP. Please try again.');
        }
      },
      error: (error: Error) => {
        console.error('Resend OTP error:', error);
        this.toastr.error('Something went wrong. Please try again.');
      },
    });
  }

  startOtpTimer() {
    this.canResendOtp = false;
    this.otpResendTimer = 60;

    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
    }

    this.otpTimerInterval = setInterval(() => {
      this.otpResendTimer--;
      if (this.otpResendTimer <= 0) {
        this.canResendOtp = true;
        clearInterval(this.otpTimerInterval);
      }
    }, 1000);
  }

  closeOtpModal() {
    this.showOtpModal = false;
    this.otpForm.reset();
    this.otpError = '';
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
    }
  }
}
