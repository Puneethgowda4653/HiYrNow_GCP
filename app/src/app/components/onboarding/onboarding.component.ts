import { Component, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
  state,
} from '@angular/animations';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css'],
  animations: [
    trigger('stepTransition', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(20px)' }),
          animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
        ], { optional: true }),
        query(':leave', [
          animate('300ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' })),
        ], { optional: true }),
      ]),
    ]),
    trigger('fadeInScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('slideInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('celebrationPulse', [
      state('idle', style({ transform: 'scale(1)' })),
      state('celebrate', style({ transform: 'scale(1.1)' })),
      transition('idle => celebrate', [
        animate('300ms ease-out'),
      ]),
      transition('celebrate => idle', [
        animate('300ms ease-in'),
      ]),
    ]),
  ],
})
export class OnboardingComponent implements OnInit {
  @ViewChild('mainContent') mainContent!: ElementRef;
  
  currentStep: number = 1;
  totalSteps: number = 5;
  isSaving: boolean = false;
  autoSaving: boolean = false;
  lastSaved: Date | null = null;
  user: any = {};
  resumeUploaded: boolean = false;
  resumeParsed: boolean = false;
  showSuccessToast: boolean = false;
  successMessage: string = '';
  onboardingData: any = {
    personalDetails: {},
    experience: [],
    education: [],
    skills: [],
    preferences: {},
  };

  steps = [
    {
      id: 1,
      title: 'Resume Upload',
      icon: '📄',
      description: 'Upload your resume to get started',
      component: 'resume-upload',
      completed: false,
      estimatedTime: '2 min',
      optional: false,
      required: true,
    },
    {
      id: 2,
      title: 'Personal Details',
      icon: '👤',
      description: 'Tell us about yourself',
      component: 'personal-details',
      completed: false,
      estimatedTime: '3 min',
      optional: false,
      required: true,
    },
    {
      id: 3,
      title: 'Experience & Education',
      icon: '🎓',
      description: 'Your professional journey',
      component: 'experience-education',
      completed: false,
      estimatedTime: '5 min',
      optional: false,
      required: true,
    },
    {
      id: 4,
      title: 'Skills & Preferences',
      icon: '⚡',
      description: 'What you bring to the table',
      component: 'skills-preferences',
      completed: false,
      estimatedTime: '3 min',
      optional: false,
      required: true,
    },
    {
      id: 5,
      title: 'Preview Profile',
      icon: '✨',
      description: 'See how recruiters will view you',
      component: 'preview-profile',
      completed: false,
      estimatedTime: '2 min',
      optional: false,
      required: false,
    },
  ];

  // Form for collecting data
  personalDetailsForm!: FormGroup;
  preferencesForm!: FormGroup;

  constructor(
    private router: Router,
    private userService: UserService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initForms();
    // Check if user already has a resume uploaded
    this.checkExistingResume();
    // Load user data to see if profile is already partially filled
    this.loadUserData();
    // Setup auto-save
    this.setupAutoSave();
  }

  // Keyboard navigation support
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Alt + Right Arrow: Next step (only if validation passes)
    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      if (this.currentStep < this.totalSteps && this.validateCurrentStep()) {
        this.nextStep();
      } else if (!this.validateCurrentStep()) {
        // Show validation message
        this.showValidationWarning();
      }
    }
    // Alt + Left Arrow: Previous step
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      if (this.currentStep > 1) {
        this.previousStep();
      }
    }
    // Ctrl/Cmd + S: Save and Exit
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.autoSaveProgress();
    }
  }

  showValidationWarning(): void {
    this.showSuccessToast = true;
    this.successMessage = `⚠️ ${this.getValidationMessage()}`;
    setTimeout(() => {
      this.showSuccessToast = false;
    }, 3000);
  }

  setupAutoSave(): void {
    // Auto-save every 30 seconds
    setInterval(() => {
      this.autoSaveProgress();
    }, 30000);
  }

  autoSaveProgress(): void {
    if (!this.autoSaving) {
      this.autoSaving = true;
      this.saveStepData();
      this.lastSaved = new Date();
      setTimeout(() => {
        this.autoSaving = false;
      }, 1000);
    }
  }

  checkExistingResume(): void {
    // Check if user already has resume data
    this.userService.findLoggedUser()
      .then((user: any) => {
        if (user && user._id) {
          // Check if user has resume or parsed data
          // If experiences/education exist, likely resume was already parsed
          this.userService.getUserDetails(user._id).subscribe(
            (response: any) => {
              if (response && response.data) {
                const { experiences, education, skill } = response.data;
                // If user has any parsed data, mark resume as uploaded
                if (experiences && experiences.length > 0 || 
                    education && education.length > 0 || 
                    skill && skill.length > 0) {
                  this.resumeUploaded = true;
                  this.resumeParsed = true;
                  this.steps[0].completed = true;
                }
              }
            },
            (error: any) => {
              console.error('Error checking existing resume:', error);
            }
          );
        }
      })
      .catch((error: any) => {
        console.error('Error checking user:', error);
      });
  }

  initForms(): void {
    this.personalDetailsForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      professionalSummary: ['', [Validators.maxLength(1000)]],
      currentCity: [''],
      currentState: [''],
      linkedin: [''],
      github: [''],
      portfolio: [''],
    });

    this.preferencesForm = this.fb.group({
      preferFullTime: [false],
      preferPartTime: [false],
      preferContract: [false],
      preferRemote: [false],
      preferHybrid: [false],
      preferOnSite: [false],
      minSalary: [''],
      maxSalary: [''],
      noticePeriod: [''],
      currentCTC: [''],
      preferredCTC: [''],
    });
  }

  loadUserData(): void {
    // First get the logged user to get userId
    this.userService.findLoggedUser()
      .then((user: any) => {
        if (user && user._id) {
          this.user = user;
          const userId = user._id;

          // Populate personal details from user
          this.onboardingData.personalDetails = {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            dateOfBirth: user.dateOfBirth || '',
            gender: user.gender || '',
            professionalSummary: user.professionalSummary || user.tagline || '',
            currentCity: user.currentCity || user.currentLocation || '',
            currentState: user.currentState || '',
            linkedin: this.getSocialLink(user.socialContact, 'linkedin') || '',
            github: this.getSocialLink(user.socialContact, 'github') || '',
            portfolio: this.getSocialLink(user.socialContact, 'portfolio') || '',
          };

          // Load existing data into forms
          if (this.personalDetailsForm) {
            this.personalDetailsForm.patchValue(this.onboardingData.personalDetails);
          }

          // Now get full user details with experiences, education, and skills
          this.userService.getUserDetails(userId).subscribe(
            (response: any) => {
              if (response && response.data) {
                const { user: userData, experiences, education, skill } = response.data;

                // Update user data
                if (userData) {
                  this.user = { ...this.user, ...userData };
                }

                // Load experiences, education, and skills
                this.onboardingData.experience = experiences || [];
                this.onboardingData.education = education || [];
                this.onboardingData.skills = skill || [];
                
                // Refresh validation state after loading data
                this.refreshValidationState();
              }
            },
            (error: any) => {
              console.error('Error loading user details:', error);
            }
          );
        }
      })
      .catch((error: any) => {
        console.error('Error loading user data:', error);
      });
  }

  refreshValidationState(): void {
    // Trigger change detection by calling validateCurrentStep
    // This ensures the UI updates when data changes
    setTimeout(() => {
      this.validateCurrentStep();
    }, 0);
  }

  private getSocialLink(socialContact: any[] | undefined, type: string): string {
    if (!socialContact || !Array.isArray(socialContact)) {
      return '';
    }
    const contact = socialContact.find((sc: any) => sc.socialtype === type);
    return contact ? contact.url || '' : '';
  }

  nextStep(): void {
    if (this.validateCurrentStep()) {
      this.steps[this.currentStep - 1].completed = true;
      
      // Show success feedback
      this.showSuccessToast = true;
      this.successMessage = `✓ Step ${this.currentStep} completed!`;
      setTimeout(() => {
        this.showSuccessToast = false;
      }, 2000);
      
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.saveStepData();
        this.scrollToTop();
        
        // Load user data after resume upload (step 1) or when entering step 2
        if (this.currentStep === 2) {
          // Resume has been uploaded and parsed, now load the extracted data
          this.loadUserData();
        }
        
        // Reload data when entering preview step
        if (this.currentStep === 5) {
          this.loadPreviewData();
        }
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollToTop();
    }
  }

  goToStep(stepNumber: number): void {
    // Allow going to previous steps or next step if current is completed
    if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
      if (stepNumber <= this.currentStep || this.steps[this.currentStep - 1].completed) {
        this.currentStep = stepNumber;
        this.scrollToTop();
        
        // Reload data when entering preview step
        if (this.currentStep === 5) {
          this.loadPreviewData();
        }
      }
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getProgressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  isStepCompleted(stepNumber: number): boolean {
    return this.steps[stepNumber - 1]?.completed || false;
  }

  isStepActive(stepNumber: number): boolean {
    return this.currentStep === stepNumber;
  }

  canGoToStep(stepNumber: number): boolean {
    return (
      stepNumber <= this.currentStep || this.isStepCompleted(this.currentStep)
    );
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        // Resume upload - MANDATORY: must have resume uploaded
        return this.resumeUploaded;
      case 2:
        // Personal details validation - check if required fields are filled
        return this.validatePersonalDetails();
      case 3:
        // Experience and Education - MANDATORY: must have at least one entry
        return this.validateExperienceAndEducation();
      case 4:
        // Skills - MANDATORY: must have at least one skill
        return this.validateSkillsAndPreferences();
      case 5:
        // Preview - always valid
        return true;
      default:
        return false;
    }
  }

  validatePersonalDetails(): boolean {
    // Check if user has basic required information
    const hasFirstName = this.onboardingData.personalDetails?.firstName || this.user?.firstName;
    const hasLastName = this.onboardingData.personalDetails?.lastName || this.user?.lastName;
    const hasEmail = this.onboardingData.personalDetails?.email || this.user?.email;
    const hasPhone = this.onboardingData.personalDetails?.phone || this.user?.phone;

    return !!(hasFirstName && hasLastName && hasEmail && hasPhone);
  }

  validateExperienceAndEducation(): boolean {
    // Must have at least one experience OR one education entry
    const hasExperience = this.onboardingData.experience && this.onboardingData.experience.length > 0;
    const hasEducation = this.onboardingData.education && this.onboardingData.education.length > 0;
    
    return hasExperience || hasEducation;
  }

  validateSkillsAndPreferences(): boolean {
    // Must have at least one skill
    const hasSkills = this.onboardingData.skills && this.onboardingData.skills.length > 0;
    
    return hasSkills;
  }

  getValidationMessage(): string {
    switch (this.currentStep) {
      case 1:
        if (!this.resumeUploaded) {
          return 'Please upload your resume to continue';
        }
        if (!this.resumeParsed) {
          return 'Please wait for resume to be processed';
        }
        return '';
      case 2:
        return 'Please fill in all required personal details (First Name, Last Name, Email, Phone)';
      case 3:
        return 'Please add at least one work experience or education entry';
      case 4:
        return 'Please add at least one skill';
      default:
        return '';
    }
  }

  saveStepData(): void {
    // Save data for current step
    // Most data is saved directly by child components via services
    // We just mark steps as completed
    if (this.currentStep === 1) {
      // Personal details are saved by personal-info component
      // We can optionally sync form data here if needed
    } else if (this.currentStep === 3) {
      // Preferences can be saved here
      this.onboardingData.preferences = this.preferencesForm.value;
    }
  }

  // Data is loaded from UserService, so we don't need event handlers
  // The child components save data directly via services

  saveAndExit(): void {
    this.isSaving = true;
    // Save preferences if on step 4
    if (this.currentStep === 4) {
      this.saveStepData();
    }
    
    // Navigate to dashboard (data is already saved by child components)
    setTimeout(() => {
      this.isSaving = false;
      this.router.navigate(['/dashboard-seeker']);
    }, 500);
  }

  completeOnboarding(): void {
    this.steps[this.currentStep - 1].completed = true;
    this.isSaving = true;

    // Save preferences if needed
    this.saveStepData();

    // Show celebration message
    this.showSuccessToast = true;
    this.successMessage = '🎉 Congratulations! Profile setup complete!';
    
    // Navigate to dashboard (data is already saved by child components via services)
    setTimeout(() => {
      this.isSaving = false;
      this.router.navigate(['/dashboard-seeker']);
    }, 1500);
  }

  getEstimatedTotalTime(): string {
    const totalMinutes = this.steps.reduce((acc, step) => {
      const minutes = parseInt(step.estimatedTime.split(' ')[0]);
      return acc + minutes;
    }, 0);
    return `${totalMinutes} min`;
  }

  getRemainingTime(): string {
    const remainingSteps = this.steps.slice(this.currentStep - 1);
    const remainingMinutes = remainingSteps.reduce((acc, step) => {
      const minutes = parseInt(step.estimatedTime.split(' ')[0]);
      return acc + minutes;
    }, 0);
    return `${remainingMinutes} min`;
  }

  getFormattedLastSaved(): string {
    if (!this.lastSaved) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - this.lastSaved.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return this.lastSaved.toLocaleTimeString();
  }

  getProfilePreviewData(): any {
    // Return current data, which is loaded from UserService
    // The preview will show data that has been saved by child components
    return {
      personalDetails: this.onboardingData.personalDetails,
      experience: this.onboardingData.experience || [],
      education: this.onboardingData.education || [],
      skills: this.onboardingData.skills || [],
      preferences: this.onboardingData.preferences || {},
      user: this.user,
    };
  }

  loadPreviewData(): void {
    // Reload user data for preview
    this.loadUserData();
  }

  // Method to be called from resume-upload component when resume is successfully parsed
  handleResumeParsed(): void {
    this.resumeParsed = true;
    this.resumeUploaded = true;
    // Mark step 1 as completed
    this.steps[0].completed = true;
    // Reload user data to get parsed information
    this.loadUserData();
    // Refresh validation state
    this.refreshValidationState();
    
    // Show success message
    this.showSuccessToast = true;
    this.successMessage = '✓ Resume processed successfully! You can now proceed.';
    setTimeout(() => {
      this.showSuccessToast = false;
    }, 3000);
  }

  calculateProfileStrength(): number {
    let score = 0;
    const maxScore = 100;

    // Resume Upload (10 points)
    if (this.resumeUploaded) score += 10;

    // Personal Details (30 points)
    if (this.onboardingData.personalDetails.firstName) score += 5;
    if (this.onboardingData.personalDetails.lastName) score += 5;
    if (this.onboardingData.personalDetails.email) score += 5;
    if (this.onboardingData.personalDetails.phone) score += 5;
    if (this.onboardingData.personalDetails.professionalSummary) score += 10;

    // Experience (30 points)
    if (this.onboardingData.experience?.length > 0) {
      score += Math.min(30, this.onboardingData.experience.length * 10);
    }

    // Education (20 points)
    if (this.onboardingData.education?.length > 0) {
      score += Math.min(20, this.onboardingData.education.length * 10);
    }

    // Skills (20 points)
    if (this.onboardingData.skills?.length > 0) {
      score += Math.min(20, this.onboardingData.skills.length * 2);
    }

    return Math.min(maxScore, score);
  }
}
