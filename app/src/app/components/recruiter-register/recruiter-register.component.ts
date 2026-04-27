import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { OtpInputComponent } from '../../ui/otpInput/otp-input.component';
import { ReferralService } from '../../services/referral.service';

@Component({
  selector: 'app-recruiter-register',
  standalone: false,
  templateUrl: './recruiter-register.component.html',
  styleUrls: ['./recruiter-register.component.css']
})
export class RecruiterRegisterComponent implements OnInit {
  currentStep = 1;
  totalSteps = 5;
  steps = ['Account', 'Company', 'Profile', 'Preferences', 'Complete'];
  
  // TESTING FLAG: Set to true to skip OTP verification for testing
  // Set to false for production - OTP verification is required
  skipOtpForTesting = false;
  
  // Forms
  step1Form: FormGroup;
  step2Form: FormGroup;
  step3Form: FormGroup;
  step4Form: FormGroup;
  
  // State
  showPassword = false;
  isLoading = false;
  showOtpModal = false;
  @ViewChild('otpInput') otpInputComponent!: OtpInputComponent;
  
  otpCode: string = '';
  otpResendTimer = 0;
  canResendOtp = true;
  emailForOtp = '';

  onOtpChange(otp: string) {
    this.otpCode = otp || '';
  }
  
  // Company sizes
  companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '501-1000 employees',
    '1000+ employees'
  ];
  
  industries = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce',
    'Marketing', 'Design', 'Consulting', 'Manufacturing', 'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private toastr: ToastrService,
    private referralService: ReferralService
  ) {
    // Step 1: Email, Password, Company Email Verification
    this.step1Form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      companyEmail: ['', [Validators.required, Validators.email]],
      acceptTerms: [false, [Validators.requiredTrue]]
    });

    // Step 2: Company Info
    this.step2Form = this.fb.group({
      companyName: ['', [Validators.required]],
      companySize: [''],
      industry: [''],
      website: [''],
      gstNumber: [
        '',
        [
          Validators.pattern(
            '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
          ),
        ],
      ],
      referralCode: ['']
    });

    // Step 3: Personal Info
    this.step3Form = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      roleAtCompany: ['', [Validators.required]]
    });

    // Step 4: Preferences
    this.step4Form = this.fb.group({
      hiringNeeds: [''],
      billingInfo: ['']
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.step1Form.patchValue({ email: params['email'] });
      }
    });
  }

  get password() {
    return this.step1Form.get('password');
  }

  get gstNumber() {
    return this.step2Form.get('gstNumber');
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
    this.step2Form.patchValue({ gstNumber: value });
  }

  referralValidationMessage = '';

  validateReferralCode(): void {
    const referralCode = this.step2Form.get('referralCode')?.value;
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

  nextStep() {
    if (this.currentStep === 1 && this.step1Form.valid) {
      // TESTING: Skip OTP verification if flag is enabled
      if (this.skipOtpForTesting) {
        console.warn('⚠️ OTP verification is disabled for testing');
        this.toastr.info('OTP verification skipped for testing');
        this.currentStep = 2;
      } else {
        // Verify company email with OTP
        this.sendCompanyEmailOtp();
      }
    } else if (this.currentStep === 2 && this.step2Form.valid) {
      this.currentStep = 3;
    } else if (this.currentStep === 3 && this.step3Form.valid) {
      this.currentStep = 4;
    } else if (this.currentStep === 4) {
      this.completeRegistration();
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  async sendCompanyEmailOtp() {
    const companyEmail = this.step1Form.get('companyEmail')?.value;
    if (!companyEmail) {
      this.toastr.warning('Please enter your company email');
      return;
    }

    this.isLoading = true;
    // Clear previous OTP
    this.otpCode = '';
    
    try {
      this.userService.sendOTP(companyEmail).subscribe({
        next: (response: any) => {
          this.showOtpModal = true;
          this.emailForOtp = companyEmail;
          this.otpCode = ''; // Clear OTP when modal opens
          // Clear OTP input component
          setTimeout(() => {
            if (this.otpInputComponent) {
              this.otpInputComponent.clear();
            }
          }, 100);
          this.startOtpTimer();
          this.toastr.success('OTP sent to your company email');
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error sending OTP:', error);
          this.toastr.error(error.error?.error || 'Failed to send OTP. Please try again.');
          this.isLoading = false;
        }
      });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      this.toastr.error('Failed to send OTP. Please try again.');
      this.isLoading = false;
    }
  }

  async verifyOtp() {
    if (!this.otpCode || this.otpCode.length !== 6) {
      this.toastr.warning('Please enter a valid 6-digit OTP');
      return;
    }

    if (!this.emailForOtp) {
      this.toastr.error('Email not found. Please request OTP again.');
      return;
    }

    this.isLoading = true;
    try {
      this.userService.verifyCompanyEmailOTP(this.emailForOtp, this.otpCode).subscribe({
        next: (response: any) => {
          this.showOtpModal = false;
          this.currentStep = 2;
          this.otpCode = ''; // Clear OTP
          this.toastr.success('Company email verified successfully!');
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error verifying OTP:', error);
          this.toastr.error(error.error?.error || 'Invalid OTP. Please try again.');
          this.isLoading = false;
        }
      });
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      this.toastr.error('Invalid OTP. Please try again.');
      this.isLoading = false;
    }
  }

  async resendOtp() {
    if (!this.emailForOtp) {
      this.toastr.warning('Please request OTP first');
      return;
    }

    this.isLoading = true;
    try {
      this.userService.sendOTP(this.emailForOtp).subscribe({
        next: (response: any) => {
          this.startOtpTimer();
          this.otpCode = ''; // Clear previous OTP
          // Clear OTP input component
          if (this.otpInputComponent) {
            this.otpInputComponent.clear();
          }
          this.toastr.success('OTP resent to your company email');
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error resending OTP:', error);
          this.toastr.error(error.error?.error || 'Failed to resend OTP. Please try again.');
          this.isLoading = false;
        }
      });
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      this.toastr.error('Failed to resend OTP. Please try again.');
      this.isLoading = false;
    }
  }

  startOtpTimer() {
    this.otpResendTimer = 60;
    this.canResendOtp = false;
    const interval = setInterval(() => {
      this.otpResendTimer--;
      if (this.otpResendTimer <= 0) {
        clearInterval(interval);
        this.canResendOtp = true;
      }
    }, 1000);
  }

  async completeRegistration() {
    if (this.step1Form.invalid || this.step2Form.invalid || this.step3Form.invalid) {
      this.toastr.warning('Please complete all required fields');
      return;
    }

    this.isLoading = true;

    try {
      // Prepare user data, only including non-empty optional fields
      const userData: any = {
        username: this.step2Form.get('companyName')?.value?.trim() || '',
        email: this.step1Form.get('email')?.value?.trim() || '',
        password: this.step1Form.get('password')?.value || '',
        role: 'Recruiter',
      };

      // Add phone if available
      const phone = this.step1Form.get('phone')?.value?.trim();
      if (phone) {
        userData.phone = phone;
      }

      // Add company fields
      const companyType = this.step2Form.get('companySize')?.value?.trim();
      if (companyType) {
        userData.companyType = companyType;
      }

      const industry = this.step2Form.get('industry')?.value?.trim();
      if (industry) {
        userData.industry = industry;
      }

      const website = this.step2Form.get('website')?.value?.trim();
      if (website) {
        // Ensure website has protocol
        let websiteUrl = website;
        if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
          websiteUrl = 'https://' + websiteUrl;
        }
        userData.website = websiteUrl;
      }

      // Add GST number if provided
      const gstNumber = this.step2Form.get('gstNumber')?.value?.trim();
      if (gstNumber) {
        userData.gstNumber = gstNumber.toUpperCase();
      }

      // Add referral code if provided
      const referralCode = this.step2Form.get('referralCode')?.value?.trim();
      if (referralCode) {
        userData.referralCode = referralCode.toUpperCase();
      }

      // Add personal info - always include these fields (even if empty) so backend can save to RecruiterDetail
      const firstName = this.step3Form.get('firstName')?.value?.trim() || '';
      userData.firstName = firstName;

      const lastName = this.step3Form.get('lastName')?.value?.trim() || '';
      userData.lastName = lastName;

      const roleAtCompany = this.step3Form.get('roleAtCompany')?.value?.trim() || '';
      userData.tagline = roleAtCompany;

      console.log('Sending registration data:', userData);

      const result = await this.userService.register(userData);
      if (result && (result.status === true || result.status === 'success')) {
        this.currentStep = 5;
        const successMessage = result.referralApplied 
          ? `Welcome! ${result.message}`
          : result.message || 'Welcome to HiYrNow! 🎉';
        this.toastr.success(successMessage);
        
        // Auto-login after registration to set session
        try {
          const email = this.step1Form.get('email')?.value?.trim();
          const password = this.step1Form.get('password')?.value;
          if (email && password) {
            const loginResult = await this.userService.login(email, password);
            if (loginResult.status === 'success') {
              // Redirect to company profile page
              setTimeout(() => {
                this.router.navigate(['/company/profile']);
              }, 2000);
            } else {
              // If auto-login fails, still redirect (user can login manually)
              setTimeout(() => {
                this.router.navigate(['/company/profile']);
              }, 2000);
            }
          } else {
            setTimeout(() => {
              this.router.navigate(['/company/profile']);
            }, 2000);
          }
        } catch (loginError) {
          console.error('Auto-login error:', loginError);
          // Still redirect to profile page
          setTimeout(() => {
            this.router.navigate(['/company/profile']);
          }, 2000);
        }
      } else {
        const errorMessage = result?.message || result?.error || 'Registration failed';
        this.toastr.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.error?.message || error.error?.error || error.message || 'Something went wrong. Please try again.';
      this.toastr.error(errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  skipStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
    }
  }
}

