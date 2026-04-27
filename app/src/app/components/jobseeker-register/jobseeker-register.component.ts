import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-jobseeker-register',
  standalone: false,
  templateUrl: './jobseeker-register.component.html',
  styleUrls: ['./jobseeker-register.component.css']
})
export class JobseekerRegisterComponent implements OnInit {
  currentStep = 1;
  totalSteps = 6;
  steps = ['Account', 'Resume', 'Personal Details', 'Experience & Education', 'Skills & Preferences', 'Complete'];
  
  // Forms
  step1Form: FormGroup;
  step2Form: FormGroup;
  step3Form: FormGroup;
  step4Form: FormGroup;
  
  // State
  showPassword = false;
  isLoading = false;
  showOtpModal = false;
  otpCode = '';
  otpResendTimer = 0;
  canResendOtp = true;
  registeredUserId: string | null = null;
  emailForOtp = '';
  resumeUploaded = false;
  resumeParsed = false;
  
  // Skills
  availableSkills: string[] = [
    'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js',
    'Python', 'Java', 'C++', 'Go', 'Rust', 'PHP', 'Ruby',
    'AWS', 'Azure', 'Docker', 'Kubernetes', 'CI/CD',
    'UI/UX Design', 'Figma', 'Adobe XD', 'Product Management',
    'Data Science', 'Machine Learning', 'AI', 'SQL', 'MongoDB'
  ];
  selectedSkills: string[] = [];
  skillInput = '';
  
  // Job preferences
  jobTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];
  workModes = ['Remote', 'Hybrid', 'On-site'];
  industries = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce',
    'Marketing', 'Design', 'Consulting', 'Manufacturing', 'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    // Step 1: Email/Phone, Password, Terms
    this.step1Form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      acceptTerms: [false, [Validators.requiredTrue]]
    });

    // Step 2: Resume (handled by resume-upload component)
    // Step 3: Personal Details (handled by personal-info component)
    // Step 4: Experience & Education (handled by experience-list and education-list components)
    // Step 5: Skills & Preferences
    this.step2Form = this.fb.group({
      // This form is not used anymore, but kept for compatibility
    });

    // Step 3: Skills (handled separately)
    this.step3Form = this.fb.group({
      skills: [[]]
    });

    // Step 4: Job Preferences
    this.step4Form = this.fb.group({
      jobType: [''],
      workMode: [''],
      desiredSalary: [''],
      industry: ['']
    });
  }

  ngOnInit() {
    // Check if coming from auth-options
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.step1Form.patchValue({ email: params['email'] });
      }
    });
  }

  get password() {
    return this.step1Form.get('password');
  }

  async nextStep() {
    if (this.currentStep === 1 && this.step1Form.valid) {
      // Create account first, then proceed to resume upload
      await this.createAccount();
    } else if (this.currentStep === 2) {
      // Resume step - can be skipped (user is now logged in)
      this.currentStep = 3;
    } else if (this.currentStep === 3) {
      // Personal details - save data
      await this.saveProfileData();
      this.currentStep = 4;
    } else if (this.currentStep === 4) {
      // Experience & Education - can be skipped if resume was parsed
      this.currentStep = 5;
    } else if (this.currentStep === 5) {
      // Skills & Preferences - save and complete
      await this.savePreferences();
      this.completeRegistration();
    }
  }

  async createAccount() {
    this.isLoading = true;
    const email = this.step1Form.value.email;
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    
    const accountData: any = {
      username: username,
      email: email,
      password: this.step1Form.value.password,
      phone: this.step1Form.value.phone || '',
      role: 'JobSeeker'
    };

    try {
      const result = await this.userService.register(accountData);
      if (result.status === true || result.status === 'success') {
        // Store user ID from registration response
        if (result.user && result.user._id) {
          this.registeredUserId = result.user._id;
        }
        
        // Auto-login after registration
        try {
          const loginResult = await this.userService.login(email, this.step1Form.value.password);
          if (loginResult.status === 'success') {
            this.toastr.success('Account created! 🎉');
            this.currentStep = 2; // Proceed to resume upload (now authenticated)
          } else {
            this.toastr.error('Account created but login failed. Please log in manually.');
            this.router.navigate(['/login']);
          }
        } catch (loginError) {
          console.error('Auto-login error:', loginError);
          this.toastr.error('Account created but login failed. Please log in manually.');
          this.router.navigate(['/login']);
        }
      } else {
        this.toastr.error(result.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      this.toastr.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async saveProfileData() {
    // Save personal details to profile
    const profileData: any = {};
    if (this.step2Form.value.firstName) profileData.firstName = this.step2Form.value.firstName;
    if (this.step2Form.value.lastName) profileData.lastName = this.step2Form.value.lastName;
    if (this.step2Form.value.currentRole) profileData.tagline = this.step2Form.value.currentRole;
    if (this.step2Form.value.location) profileData.currentLocation = this.step2Form.value.location;

    if (Object.keys(profileData).length > 0) {
      try {
        await this.userService.updateUserProfile(profileData);
      } catch (error) {
        console.error('Error saving profile data:', error);
      }
    }
  }

  async savePreferences() {
    // Save preferences to profile
    const profileData: any = {};
    if (this.step4Form.value.jobType) profileData.preferredJobType = this.step4Form.value.jobType;
    if (this.step4Form.value.workMode) profileData.preferredLocation = this.step4Form.value.workMode;
    if (this.step4Form.value.desiredSalary) {
      const salaryMatch = this.step4Form.value.desiredSalary.match(/\$?(\d+)[,\s]*-\s*\$?(\d+)/);
      if (salaryMatch) {
        profileData.minSalary = parseInt(salaryMatch[1].replace(/,/g, ''));
        profileData.maxSalary = parseInt(salaryMatch[2].replace(/,/g, ''));
      }
    }
    if (this.step4Form.value.industry) profileData.industry = this.step4Form.value.industry;

    if (Object.keys(profileData).length > 0) {
      try {
        await this.userService.updateUserProfile(profileData);
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  addSkill(skill: string) {
    if (skill && !this.selectedSkills.includes(skill)) {
      this.selectedSkills.push(skill);
      this.skillInput = '';
    }
  }

  removeSkill(skill: string) {
    this.selectedSkills = this.selectedSkills.filter(s => s !== skill);
  }

  async completeRegistration() {
    this.isLoading = true;
    
    // Save any remaining preferences
    await this.savePreferences();

    // Save skills if any
    if (this.selectedSkills.length > 0) {
      try {
        // Skills are saved via the skill-list component, but we can trigger it here if needed
        // The skill-list component handles its own saving
      } catch (error) {
        console.error('Error saving skills:', error);
      }
    }

    // Show success and navigate to profile page
    this.currentStep = 6; // Success step
    this.toastr.success('Profile setup complete! 🎉');
    
    // Get current user ID from session and redirect to profile
    try {
      const currentUser = await this.userService.getCurrentUser().toPromise();
      if (currentUser) {
        setTimeout(() => {
          this.router.navigate(['/profile', currentUser]);
        }, 2000);
      } else if (this.registeredUserId) {
        // Use stored user ID from registration
        setTimeout(() => {
          this.router.navigate(['/profile', this.registeredUserId]);
        }, 2000);
      } else {
        // Fallback: redirect to onboarding (user can complete profile there)
        setTimeout(() => {
          this.router.navigate(['/onboarding']);
        }, 2000);
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
      // Fallback: redirect to onboarding
      setTimeout(() => {
        this.router.navigate(['/onboarding']);
      }, 2000);
    }
  }

  handleResumeParsed() {
    this.resumeParsed = true;
    this.resumeUploaded = true;
    this.toastr.success('Resume processed successfully!');
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

