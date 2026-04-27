// summit-signup.component.ts
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-summit-signup',
  templateUrl: './summit-signup.component.html',
  styleUrls: ['./summit-signup.component.css'],
})
export class SummitSignupComponent {
  signupForm: FormGroup;
  isLoading = false;
  showPassword = false;
  focusedField: string | null = null; // Added for floating label animations

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      companyEmail: [
        '',
        [Validators.required, Validators.email, this.businessEmailValidator],
      ],
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.required, this.phoneNumberValidator]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async submit() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      if (this.signupForm.get('companyEmail')?.hasError('personalEmail')) {
        this.toastr.warning('Please use your work email (Gmail not allowed).');
      } else {
        this.toastr.warning('Please fill in all required fields correctly.');
      }
      return;
    }

    this.isLoading = true;

    const { fullName, companyEmail, companyName, phoneNumber, password } =
      this.signupForm.value;

    const payload = {
      fullName,
      email: companyEmail,
      companyEmail,
      companyName,
      phoneNumber,
      password,
    };

    try {
      const result = await this.userService.summitSignup(payload);

      if (result && (result.success === true || result.status === 'success')) {
        this.toastr.success('Registration successful. Logging you in...');

        try {
          const email = companyEmail?.trim();
          const userPassword = password;

          if (email && userPassword) {
            const loginResult = await this.userService.login(
              email,
              userPassword
            );

            if (loginResult && loginResult.status === 'success') {
              await this.router.navigate(['/summit']);
              return;
            }
          }

          this.toastr.warning(
            'Registered but auto-login failed. Please login manually.'
          );
          await this.router.navigate(['/login']);
        } catch (loginError) {
          console.error('Auto-login error:', loginError);
          this.toastr.warning(
            'Registered but auto-login failed. Please login manually.'
          );
          await this.router.navigate(['/login']);
        }
      } else {
        const errorMessage =
          result?.message || result?.error || 'Registration failed.';
        this.toastr.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Summit signup error:', error);
      const message =
        error?.error?.message ||
        error?.error?.error ||
        error?.message ||
        'Unable to complete registration. Please try again.';
      this.toastr.error(message);
    } finally {
      this.isLoading = false;
    }
  }

  private businessEmailValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value?.toLowerCase().trim();
    if (!value) {
      return null;
    }

    const blockedDomains = ['gmail.com', 'googlemail.com'];
    if (blockedDomains.some((domain) => value.endsWith(`@${domain}`))) {
      return { personalEmail: true };
    }

    return null;
  }

  private phoneNumberValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value?.trim();
    if (!value) {
      return null;
    }

    // Indian phone number validation: 10 digits, optionally with +91 or 0 prefix
    const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
    const cleanedPhone = value.replace(/[\s-]/g, ''); // Remove spaces and dashes
    
    if (!phoneRegex.test(cleanedPhone)) {
      return { invalidPhone: true };
    }

    return null;
  }
}