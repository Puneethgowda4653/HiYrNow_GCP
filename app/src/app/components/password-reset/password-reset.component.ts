import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr'; // Optional, for notifications

@Component({
  selector: 'app-password-reset',
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.css'],
})
export class PasswordResetComponent implements OnInit {
  requestForm!: FormGroup;
  resetForm!: FormGroup;
  isTokenSent = false;
  isToken = false;
  isSubmittingRequest = false;
  isSubmittingReset = false;
  isResetSuccess = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    // Initialize forms
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.resetForm = this.fb.group({
      token: [''],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });

    // Check for token in URL
    this.route.params.subscribe((params) => {
      const token = params['token'];
      if (token) {
        this.isTokenSent = true;
        this.isToken = true;
        this.resetForm.patchValue({ token });
      }
    });
  }

  isFieldInvalid(formName: string, field: string): boolean {
    const form = formName === 'requestForm' ? this.requestForm : this.resetForm;
    const formControl = form.get(field);
    return formControl
      ? formControl.invalid && (formControl.dirty || formControl.touched)
      : false;
  }

  passwordsDoNotMatch(): boolean {
    const newPassword = this.resetForm.get('newPassword')?.value || '';
    const confirmPassword = this.resetForm.get('confirmPassword')?.value || '';
    const confirmField = this.resetForm.get('confirmPassword');

    // Only check for mismatch if the confirmation field has been interacted with
    return (
      newPassword !== confirmPassword &&
      confirmField?.dirty === true &&
      confirmField?.touched === true
    );
  }

  // Request password reset link
  requestPasswordReset() {
    if (this.requestForm.valid) {
      this.isSubmittingRequest = true;

      this.userService
        .requestPasswordReset(this.requestForm.value.email)
        .subscribe(
          () => {
            this.toastr.success('Password reset link sent to your email');
            this.isTokenSent = true;
            this.isSubmittingRequest = false;
          },
          (error) => {
            const errorMessage =
              error.error?.error || 'Error sending password reset link';
            this.toastr.error(errorMessage);
            console.error('Error:', error);
            this.isSubmittingRequest = false;
          }
        );
    } else {
      // Mark fields as touched to trigger validation
      Object.keys(this.requestForm.controls).forEach((key) => {
        const control = this.requestForm.get(key);
        control?.markAsTouched();
      });

      this.toastr.warning('Please enter a valid email address');
    }
  }

  // Reset password with token
  resetPassword() {
    if (this.resetForm.invalid) {
      // Mark fields as touched to trigger validation
      Object.keys(this.resetForm.controls).forEach((key) => {
        const control = this.resetForm.get(key);
        control?.markAsTouched();
      });

      this.toastr.warning('Please fill out all fields correctly');
      return;
    }

    if (this.passwordsDoNotMatch()) {
      this.toastr.warning('Passwords do not match!');
      return;
    }

    this.isSubmittingReset = true;

    this.userService.resetPassword(this.resetForm.value).subscribe(
      () => {
        this.toastr.success('Password has been reset successfully');
        this.isSubmittingReset = false;
        this.isToken = false;
        this.isResetSuccess = true;
        // We'll show success message instead of immediately redirecting
        // setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      (error) => {
        this.toastr.error('Error resetting password');
        console.error('Error:', error);
        this.isSubmittingReset = false;
      }
    );
  }
}
