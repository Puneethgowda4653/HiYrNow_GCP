import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';
import { ReferralService } from '../../services/referral.service';

@Component({
  selector: 'app-employer-register',
  templateUrl: './employer-register.component.html',
  styleUrls: ['./employer-register.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '0.3s ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate(
          '0.4s ease-out',
          style({ opacity: 1, transform: 'translateX(0)' })
        ),
      ]),
    ]),
  ],
})
export class EmployerRegisterComponent implements OnInit {
  registerForm!: FormGroup;
  submitting = false;
  registrationError: string | null = null;
  showPassword = false;
  passwordStrength = 0;
  passwordStrengthText = '';
  showOTPForm = false;
  otp: string[] = Array(6).fill('');
  otpTimer = 300; // 5 minutes in seconds
  otpError: string | null = null;
  loading = false;
  referralValidationMessage = '';

  // Tabs for form organization
  activeTab = 'company';
  tabs = [
    { id: 'company', label: 'Company', icon: 'building' },
    { id: 'contact', label: 'Contact', icon: 'mail' },
    { id: 'account', label: 'Account', icon: 'lock' },
  ];

  // Benefits list for the info panel
  benefits = [
    {
      title: 'Access Top Talent',
      description: 'Connect with skilled professionals perfect for your needs',
    },
    {
      title: 'Smart Matching',
      description: 'Our AI helps find candidates that match your requirements',
    },
    {
      title: 'Time-Saving Tools',
      description: 'Streamline your hiring process with our platform',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private toastr: ToastrService,
    private referralService: ReferralService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.registerForm.valueChanges.subscribe(() => {
      if (this.password?.value) {
        this.calculatePasswordStrength(this.password.value);
      }
    });
  }

  private initForm(): void {
    this.registerForm = this.fb.group(
      {
        // Company Tab
        companyName: ['', Validators.required],
        companyType: ['', Validators.required],
        industry: ['', Validators.required],
        gstNumber: [
          '',
          [
            Validators.pattern(
              '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
            ),
          ],
        ],
        // Contact Tab
        email: [
          '',
          [
            Validators.required,
            Validators.email,
            Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'),
          ],
        ],
        phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
        website: [
          '',
          [
            Validators.required,
            Validators.pattern(
              '^(https?://)?([\\da-z.-]+)\\.([a-z.]{2,6})[/\\w .-]*/?$'
            ),
          ],
        ],
        referralCode: [''], // Optional referral code

        // Account Tab
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'
            ),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
        acceptTerms: [false, [Validators.requiredTrue]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  private passwordMatchValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    if (password?.value && confirmPassword?.value) {
      return password.value === confirmPassword.value
        ? null
        : { passwordMismatch: true };
    }
    return null;
  }

  selectTab(tabId: string): void {
    // Only change tab if all fields in current tab are valid
    const currentTabValid = this.isCurrentTabValid();

    if (currentTabValid || tabId === this.activeTab) {
      this.activeTab = tabId;
    } else {
      this.markCurrentTabControlsAsTouched();
      this.toastr.warning(
        'Please complete the current section before moving forward'
      );
    }
  }

  isCurrentTabValid(): boolean {
    let valid = true;
    const controls = this.getControlsForTab(this.activeTab);

    for (const control of controls) {
      const formControl = this.registerForm.get(control);
      if (formControl && formControl.invalid) {
        valid = false;
        break;
      }
    }

    return valid;
  }

  markCurrentTabControlsAsTouched(): void {
    const controls = this.getControlsForTab(this.activeTab);

    for (const control of controls) {
      const formControl = this.registerForm.get(control);
      if (formControl) {
        formControl.markAsTouched();
      }
    }
  }

  getControlsForTab(tabId: string): string[] {
    switch (tabId) {
      case 'company':
        return ['companyName', 'companyType', 'industry'];
      case 'contact':
        return ['email', 'phone', 'website'];
      case 'account':
        return ['password', 'confirmPassword', 'acceptTerms'];
      default:
        return [];
    }
  }
  // Add to your component class
  get gstNumber() {
    return this.registerForm.get('gstNumber');
  }

  isGstNumberInvalid(): boolean {
    return (this.gstNumber?.invalid && this.gstNumber?.touched) || false;
  }

  formatGstNumber(event: any): void {
    let value = event.target.value.replace(/[^A-Z0-9]/g, '');
    value = value.toUpperCase();
    if (value.length > 15) {
      value = value.substring(0, 15);
    }
    this.registerForm.patchValue({ gstNumber: value });
  }
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  validateReferralCode(): void {
    const referralCode = this.registerForm.get('referralCode')?.value;
    if (!referralCode || referralCode.trim() === '') {
      this.referralValidationMessage = '';
      return;
    }

    this.referralService.validateReferralCode(referralCode.trim().toUpperCase()).subscribe({
      next: (response) => {
        if (response.referral) {
          const offer = response.referral.offerType === 'freePlan' 
            ? `${response.referral.offerDetails.freePlan} plan for ${response.referral.offerDetails.durationDays} days`
            : response.referral.offerType;
          this.referralValidationMessage = `✅ Valid referral! You'll get ${offer} free!`;
        } else {
          this.referralValidationMessage = '❌ Invalid referral code';
        }
      },
      error: (error) => {
        this.referralValidationMessage = '❌ Invalid referral code';
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.markAllControlsAsTouched();
      this.toastr.warning('Please fill in all required fields correctly');
      return;
    }

    this.submitting = true;
    this.registrationError = null;

    try {
      // Prepare user data, only including non-empty optional fields
      const userData: any = {
        username: this.registerForm.get('companyName')?.value?.trim() ?? '',
        email: this.registerForm.get('email')?.value?.trim() ?? '',
        password: this.registerForm.get('password')?.value ?? '',
        role: 'Recruiter',
      };

      // Add optional fields only if they have values
      const phone = this.registerForm.get('phone')?.value?.trim();
      if (phone) {
        userData.phone = phone;
      }

      const gstNumber = this.registerForm.get('gstNumber')?.value?.trim();
      if (gstNumber) {
        userData.gstNumber = gstNumber;
      }

      const companyType = this.registerForm.get('companyType')?.value?.trim();
      if (companyType) {
        userData.companyType = companyType;
      }

      const industry = this.registerForm.get('industry')?.value?.trim();
      if (industry) {
        userData.industry = industry;
      }

      const website = this.registerForm.get('website')?.value?.trim();
      if (website) {
        // Ensure website has protocol
        let websiteUrl = website;
        if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
          websiteUrl = 'https://' + websiteUrl;
        }
        userData.website = websiteUrl;
      }

      const referralCode = this.registerForm.get('referralCode')?.value?.trim();
      if (referralCode) {
        userData.referralCode = referralCode.toUpperCase();
      }

      console.log('Sending registration data:', userData);

      const response = await this.userService.register(userData);

      if (response && (response.status === true || response.status === 'success')) {
        this.showOTPForm = true;
        this.startOTPTimer();
        const successMessage = response.referralApplied 
          ? `OTP sent! ${response.message}`
          : response.message || 'OTP has been sent to your email. Please verify.';
        this.toastr.success(successMessage);
      } else {
        const errorMessage = response?.message || response?.error || 'Registration failed. Please try again.';
        this.registrationError = errorMessage;
        this.toastr.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.error?.message || error.error?.error || error.message || 'An unexpected error occurred. Please try again.';
      this.registrationError = errorMessage;
      this.toastr.error(errorMessage);
    } finally {
      this.submitting = false;
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  private markAllControlsAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach((key) => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  private calculatePasswordStrength(password: string): void {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    this.passwordStrength = strength;

    switch (strength) {
      case 0:
      case 1:
        this.passwordStrengthText = 'Weak password';
        break;
      case 2:
        this.passwordStrengthText = 'Fair password';
        break;
      case 3:
        this.passwordStrengthText = 'Good password';
        break;
      case 4:
        this.passwordStrengthText = 'Strong password';
        break;
    }
  }

  // Convenience getters for form controls
  get companyName() {
    return this.registerForm?.get('companyName');
  }
  get companyType() {
    return this.registerForm?.get('companyType');
  }
  get industry() {
    return this.registerForm?.get('industry');
  }
  get website() {
    return this.registerForm?.get('website');
  }
  get email() {
    return this.registerForm?.get('email');
  }
  get phone() {
    return this.registerForm?.get('phone');
  }
  get password() {
    return this.registerForm?.get('password');
  }
  get confirmPassword() {
    return this.registerForm?.get('confirmPassword');
  }
  get acceptTerms() {
    return this.registerForm?.get('acceptTerms');
  }

  // Validation check methods
  isCompanyNameInvalid(): boolean {
    return !!(
      this.companyName &&
      this.companyName.invalid &&
      this.companyName.touched
    );
  }
  isEmailInvalid(): boolean {
    return !!(this.email && this.email.invalid && this.email.touched);
  }
  isPhoneInvalid(): boolean {
    return !!(this.phone && this.phone.invalid && this.phone.touched);
  }
  isPasswordInvalid(): boolean {
    return !!(this.password && this.password.invalid && this.password.touched);
  }
  isConfirmPasswordInvalid(): boolean {
    return !!(
      this.registerForm?.hasError('passwordMismatch') &&
      this.confirmPassword?.touched
    );
  }

  // OTP related methods
  openOTPModal(): void {
    this.showOTPForm = true;
    this.startOTPTimer();
  }

  closeOTPModal(): void {
    this.showOTPForm = false;
    this.otp = Array(6).fill('');
    this.otpError = null;
    this.otpTimer = 300;
  }

  startOTPTimer(): void {
    const timer = setInterval(() => {
      if (this.otpTimer > 0) {
        this.otpTimer--;
      } else {
        clearInterval(timer);
        this.otpError = 'OTP has expired. Please request a new one.';
      }
    }, 1000);
  }

  get timerDisplay(): string {
    const minutes = Math.floor(this.otpTimer / 60);
    const seconds = this.otpTimer % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  onOTPDigitInput(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value.length === 1 && /[0-9]/.test(value)) {
      this.otp[index] = value;
      if (index < 5) {
        const nextInput = document.querySelector(
          `[data-index="${index + 1}"]`
        ) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  }

  onOTPDigitBackspace(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otp[index]) {
      if (index > 0) {
        const prevInput = document.querySelector(
          `[data-index="${index - 1}"]`
        ) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
        }
      }
    }
  }

  selectInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  updateOTPValue(): void {
    this.otpError = null;
  }

  isOTPComplete(): boolean {
    return this.otp.every((digit) => digit !== '');
  }

  async verifyOTP(): Promise<void> {
    if (!this.isOTPComplete()) {
      this.otpError = 'Please enter the complete OTP code';
      return;
    }

    this.loading = true;
    this.otpError = null;

    try {
      const otpCode = this.otp.join('');
      const email = this.registerForm.get('email')?.value;
      const response = await this.userService
        .verifyOTP(email, otpCode)
        .toPromise();

      if (response && response.message === 'OTP verified successfully') {
        this.closeOTPModal();
        this.toastr.success('Email verified successfully!');
        this.router.navigate(['company/profile']);
      } else {
        this.otpError = response?.error || 'Invalid OTP. Please try again.';
      }
    } catch (error: any) {
      this.otpError = error.error?.error || 'Invalid OTP. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}
