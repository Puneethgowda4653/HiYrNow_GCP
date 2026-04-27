import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-job-application-modal',
  templateUrl: './job-application-modal.component.html',
  styleUrls: ['./job-application-modal.component.css'],
})
export class JobApplicationModalComponent {
  @Input() isOpen: boolean = false;
  @Input() job: any;
  user: any;
  userId!: string;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() submitEvent = new EventEmitter<{
    coverLetter: string;
    customQuestions: string[];
  }>();
  @Output() editProfileEvent = new EventEmitter<void>();
  @Output() editResumeEvent = new EventEmitter<void>();
  @Output() editExperienceEvent = new EventEmitter<void>();
  @Output() editEducationEvent = new EventEmitter<void>();
  @Output() editSkillsEvent = new EventEmitter<void>();
  showEditModal: boolean = false;
  editMode: 'resume' | 'profile' = 'profile';

  currentStep: number = 1;
  applicationForm: FormGroup;
  get customQuestionsFormArray() {
    return this.applicationForm.get('customQuestions') as FormArray;
  }
  resume: any[] = [];
  experiences: any[] = [];
  education: any[] = [];
  skills: any[] = [];
  isLoading: boolean = false;
  profileStrength: number = 0;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService
  ) {
    this.applicationForm = this.fb.group({
      coverLetter: [''],
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.initCustomQuestions();
  }

  ngOnChanges() {
    this.initCustomQuestions();
  }

  initCustomQuestions() {
    if (
      this.job &&
      Array.isArray(this.job.customQuestions) &&
      this.job.customQuestions.length > 0
    ) {
      if (!this.applicationForm.contains('customQuestions')) {
        this.applicationForm.addControl('customQuestions', this.fb.array([]));
      }
      const arr = this.applicationForm.get('customQuestions') as FormArray;
      arr.clear();
      this.job.customQuestions.forEach((q: any) => {
        arr.push(
          this.fb.control('', q.required ? Validators.required : undefined)
        );
      });
    } else {
      if (this.applicationForm.contains('customQuestions')) {
        this.applicationForm.removeControl('customQuestions');
      }
    }
  }

  canProceedToNextStep(): boolean {
    if (this.currentStep === 1) return true;
    if (this.currentStep === 2) {
      // Check if custom questions are valid (if any exist)
      if (this.customQuestionsFormArray) {
        return this.customQuestionsFormArray.valid;
      }
      return true;
    }
    if (this.currentStep === 3) {
      // Cover letter is optional, so we can always proceed
      return true;
    }
    return true;
  }

  loadUserData() {
    this.isLoading = true;
    this.userService
      .findLoggedUser()
      .then((user) => {
        this.user = user;
        this.userId = this.user._id;
        this.fetchUserDetails();
      })
      .catch((error) => {
        console.error('Error loading user data:', error);
      })
      .finally(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  }

  fetchUserDetails(): void {
    const resumeRequest = this.userService.getUserResume(this.userId);
    const detailsRequest = this.userService.getUserDetails(this.userId);

    Promise.all([resumeRequest.toPromise(), detailsRequest.toPromise()])
      .then(([resumeData, userResponse]: [any, any]) => {
        const userDetails = userResponse.data;
        if (resumeData && resumeData.length > 0) {
          const latestFile = resumeData[resumeData.length - 1];
          this.resume = [
            {
              filename: latestFile.filename,
              originalname: latestFile.originalname,
              contentType: latestFile.contentType,
            },
          ];
        }

        if (userDetails) {
          this.user = userDetails.user;
          this.experiences = userDetails.experiences || [];
          this.education = userDetails.education || [];
          this.skills = userDetails.skill || [];
        }

        // Calculate profile strength after data is loaded
        this.calculateProfileStrength();
        this.cdr.detectChanges();
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
      });
  }

  calculateProfileStrength(): void {
    let strength = 0;
    const maxStrength = 100;
    
    // Basic info (30 points)
    if (this.user?.firstName) strength += 5;
    if (this.user?.lastName) strength += 5;
    if (this.user?.email) strength += 5;
    if (this.user?.phone) strength += 5;
    if (this.user?.location) strength += 5;
    if (this.user?.tagline) strength += 5;
    
    // Resume (15 points)
    if (this.resume && this.resume.length > 0) strength += 15;
    
    // Experiences (20 points)
    if (this.experiences && this.experiences.length > 0) {
      strength += Math.min(this.experiences.length * 5, 20);
    }
    
    // Education (15 points)
    if (this.education && this.education.length > 0) {
      strength += Math.min(this.education.length * 7.5, 15);
    }
    
    // Skills (20 points)
    if (this.skills && this.skills.length > 0) {
      strength += Math.min(this.skills.length * 2, 20);
    }
    
    this.profileStrength = Math.min(strength, maxStrength);
  }

  handleEditModalClose(): void {
    this.showEditModal = false;
    this.loadUserData();
    this.calculateProfileStrength();
  }

  handleProfileUpdate(event: { section: string; data: any }): void {
    this.showEditModal = false;
    this.loadUserData();
    this.calculateProfileStrength();
    this.toastr.success('Profile updated successfully');
  }

  editProfile(): void {
    this.editMode = 'profile';
    this.showEditModal = true;
  }

  editResume(): void {
    this.editMode = 'resume';
    this.showEditModal = true;
  }

  editExperience(): void {
    this.editMode = 'profile';
    this.showEditModal = true;
  }

  editEducation(): void {
    this.editMode = 'profile';
    this.showEditModal = true;
  }

  editSkills(): void {
    this.editMode = 'profile';
    this.showEditModal = true;
  }

  clearCoverLetter(): void {
    this.applicationForm.patchValue({ coverLetter: '' });
  }

  skipCoverLetter(): void {
    // Skip cover letter and go directly to next step
    this.nextStep();
  }

  skipCoverLetterAndSubmit(): void {
    this.applicationForm.patchValue({ coverLetter: '' });
    this.submitApplication();
  }

  downloadPdf(filename: string, contentType: string): void {
    this.userService.downloadPDF(filename, this.userId).subscribe(
      (res: Blob) => {
        const file = new Blob([res], { type: contentType });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL);
        this.toastr.success('Resume downloaded successfully');
      },
      (error) => {
        console.error('Error downloading PDF:', error);
        this.toastr.error('Failed to download resume');
      }
    );
  }

  closeModal(): void {
    this.currentStep = 1;
    this.applicationForm.reset();
    this.closeModalEvent.emit();
  }

  nextStep(): void {
    if (this.currentStep === 2) {
      // Validate custom questions before proceeding
      if (this.customQuestionsFormArray) {
        this.customQuestionsFormArray.controls.forEach((ctrl) => {
          ctrl.markAsTouched();
        });
        if (!this.customQuestionsFormArray.valid) {
          return;
        }
      }
    }

    if (this.currentStep < 4) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  submitApplication(): void {
    this.submitEvent.emit({
      coverLetter: this.applicationForm.get('coverLetter')?.value || '',
      customQuestions: this.applicationForm.get('customQuestions')?.value || [],
    });
    this.toastr.success('Application submitted successfully');
    this.closeModal();
  }

  // Add this method for *ngFor trackBy
  trackByIndex(index: number, item: any): number {
    return index;
  }

  // Get formatted profile data for profile-preview-card
  get formattedProfileData(): any {
    return {
      user: this.user,
      personalDetails: {
        firstName: this.user?.firstName || '',
        lastName: this.user?.lastName || '',
        professionalSummary: this.user?.professionalSummary || this.user?.tagline || '',
        currentCity: this.user?.currentCity || '',
        currentState: this.user?.currentState || '',
        linkedin: this.user?.linkedin || '',
        github: this.user?.github || '',
        portfolio: this.user?.portfolio || '',
      },
      skills: this.skills || [],
      experience: this.experiences || [],
      education: this.education || [],
      resume: this.resume || [],
    };
  }
}
