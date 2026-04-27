// personal-info.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { languagesList } from '../../resources/language-list ';
import { ShareModalComponent } from '../share-modal/share-modal.component';
import { NgxFileDropEntry } from 'ngx-file-drop';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-personal-info',
  templateUrl: './personal-info.component.html',
  styleUrls: ['./personal-info.component.css'],
})
export class PersonalInfoComponent implements OnInit {
  personalInfoForm!: FormGroup;

  user: any;
  editMode = false;
  currentStep = 1;
  userProfileLink: string | undefined;
  languageList: string[] = languagesList;
  filteredLanguages: string[] = [];
  languageSearchTerm: string = '';
  isLoadingLanguages: boolean = false;
  showLanguageDropdown: boolean = false;

  // Popular Indian cities for quick selection
  popularCities = [
    'New Delhi',
    'Bengaluru',
    'Mumbai',
    'Pune',
    'Chennai',
    'Hyderabad',
    'Gurugram',
    'Noida',
    'Ahmedabad',
    'Kolkata',
  ];

  // Loading states
  isLoading = false;
  isSaving = false;
  isUploading = false;

  // Form validation states
  formErrors: { [key: string]: string } = {};

  genderOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Others', label: 'Others' },
  ];

  maritalStatusOptions = [
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' },
  ];

  jobTypeOptions = [
    { value: 'On-site', label: 'On-site' },
    { value: 'Remote', label: 'Remote' },
    { value: 'Hybrid', label: 'Hybrid' },
  ];

  aiMatchingIntensityOptions = [
    {
      value: 'conservative',
      label: 'Conservative',
      description: 'Fewer, highly relevant matches',
    },
    {
      value: 'balanced',
      label: 'Balanced',
      description: 'Good mix of relevance and variety',
    },
    {
      value: 'aggressive',
      label: 'Aggressive',
      description: 'More matches, including related opportunities',
    },
  ];

  @ViewChild(ShareModalComponent) shareModal!: ShareModalComponent;
  isProfilePicModalOpen = false;
  profilePicUrl!: string;
  profilePicExist = false;
  imageUrl =
    'https://static.vecteezy.com/system/resources/thumbnails/009/734/564/small/default-avatar-profile-icon-of-social-media-user-vector.jpg';
  isJobSeeking = true;
  connections = 2;
  experience = '';
  userId: string = '';
  isCurrentUser: boolean = false;
  firstName = 'firstName';
  lastName = 'lastName';
  tagline = '';
  facebook = '';
  linkedin = '';
  github = '';
  twitter = '';
  socialContact: any[] = [];
  modaleditMode = false;
  toastr: any;
  isEditBioModalOpen: boolean = false;
  dropdownOpen: boolean = false;
  editModemodal: boolean = false;

  constructor(
  private fb: FormBuilder, 
  private userService: UserService,
  private http: HttpClient,
  private toastrService: ToastrService
) {}

  ngOnInit() {
    this.initForm();
    this.loadUserData();
    this.isCurrentUser = true;
    this.setupFormValidation();

    // Initialize location validation
    this.updateLocationValidation();
  }

  initForm() {
    this.personalInfoForm = this.fb.group({
      // Personal Details (Step 1)
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      firstName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ],
      ],
      lastName: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      phone: ['',],
      dateOfBirth: ['', [this.dateValidator()]],
      gender: [''],
      maritalStatus: [''], // No longer required - moved to preferences
      languagesKnown: [[]],
      totalExp: ['', [Validators.min(0), Validators.max(50)]],

      // Professional Details (Step 2)
      currentState: [''],
      currentCity: ['', [Validators.required]],
      popularCity: [''],
      professionalSummary: ['', [Validators.maxLength(1000)]],
      portfolio: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      linkedin: [
        '',
        [Validators.pattern(/^https?:\/\/(www\.)?linkedin\.com\/.+/)],
      ],
      github: ['', [Validators.pattern(/^https?:\/\/(www\.)?github\.com\/.+/)]],
      twitter: ['', [Validators.pattern(/^https?:\/\/(www\.)?x\.com\/.+/)]],
      currentCTC: ['', [Validators.min(0), Validators.max(10000000)]],
      preferredCTC: ['', [Validators.min(0), Validators.max(10000000)]],
      noticePeriod: ['', [Validators.min(0), Validators.max(365)]],

      // AI Preferences (Step 3)
      preferFullTime: [false],
      preferPartTime: [false],
      preferContract: [false],
      preferRemote: [false],
      preferHybrid: [false],
      preferOnSite: [false],
      minSalary: ['', [Validators.min(0), Validators.max(1000000)]],
      maxSalary: ['', [Validators.min(0), Validators.max(1000000)]],
      aiMatchingIntensity: ['balanced', Validators.required],
      profileVisible: [true],
      allowAIRecommendations: [true],
      allowEmailNotifications: [true],
      openToRelocate: [false],
    });

    // Add cross-field validation for salary range
    this.personalInfoForm.get('maxSalary')?.valueChanges.subscribe(() => {
      this.validateSalaryRange();
    });
    this.personalInfoForm.get('minSalary')?.valueChanges.subscribe(() => {
      this.validateSalaryRange();
    });
  }

  setupFormValidation() {
    // Monitor form changes for real-time validation
    this.personalInfoForm.valueChanges.subscribe(() => {
      this.updateFormErrors();
    });
  }

  updateFormErrors() {
    this.formErrors = {};
    Object.keys(this.personalInfoForm.controls).forEach((key) => {
      const control = this.personalInfoForm.get(key);
      if (control?.invalid && control?.touched) {
        this.formErrors[key] = this.getErrorMessage(key, control);
      }
    });
  }

  getErrorMessage(fieldName: string, control: any): string {
    const errors = control.errors;
    if (!errors) return '';

    switch (fieldName) {
      case 'username':
        if (errors['required']) return 'Username is required';
        if (errors['minlength'])
          return 'Username must be at least 3 characters';
        if (errors['maxlength']) return 'Username cannot exceed 50 characters';
        break;
      case 'firstName':
      case 'lastName':
        if (errors['required'])
          return `${
            fieldName === 'firstName' ? 'First' : 'Last'
          } name is required`;
        if (errors['minlength'])
          return `${
            fieldName === 'firstName' ? 'First' : 'Last'
          } name must be at least 2 characters`;
        if (errors['maxlength'])
          return `${
            fieldName === 'firstName' ? 'First' : 'Last'
          } name cannot exceed 50 characters`;
        break;
      case 'email':
        if (errors['required']) return 'Email is required';
        if (errors['email']) return 'Please enter a valid email address';
        break;
      case 'phone':
        if (errors['required']) return 'Phone number is required';
        if (errors['pattern'])
          return 'Please enter a valid 10-digit phone number';
        break;
      case 'dateOfBirth':
        if (errors['required']) return 'Date of birth is required';
        if (errors['invalidDate']) return 'Please enter a valid date';
        break;
      case 'gender':
      case 'maritalStatus':
        if (errors['required'])
          return `${
            fieldName === 'gender' ? 'Gender' : 'Marital status'
          } is required`;
        break;
      case 'currentState':
      case 'currentCity':
        if (errors['required'])
          return `${
            fieldName === 'currentState' ? 'State' : 'City'
          } is required`;
        break;
      case 'minSalary':
      case 'maxSalary':
        if (errors['min']) return 'Salary cannot be negative';
        if (errors['max']) return 'Salary cannot exceed $1,000,000';
        break;
      case 'totalExp':
        if (errors['min']) return 'Experience cannot be negative';
        if (errors['max']) return 'Experience cannot exceed 50 years';
        break;
      case 'noticePeriod':
        if (errors['min']) return 'Notice period cannot be negative';
        if (errors['max']) return 'Notice period cannot exceed 365 days';
        break;
      case 'linkedin':
      case 'github':
      case 'twitter':
      case 'portfolio':
        if (errors['pattern']) return `Please enter a valid ${fieldName} URL`;
        break;
    }
    return 'Invalid input';
  }

  dateValidator() {
    return (control: any) => {
      if (!control.value) return null;

      const date = new Date(control.value);
      const today = new Date();
      const minDate = new Date('1900-01-01');

      if (isNaN(date.getTime())) return { invalidDate: true };
      if (date > today) return { futureDate: true };
      if (date < minDate) return { tooOld: true };

      return null;
    };
  }

  validateSalaryRange() {
    const minSalary = this.personalInfoForm.get('minSalary')?.value;
    const maxSalary = this.personalInfoForm.get('maxSalary')?.value;

    if (minSalary && maxSalary && Number(minSalary) > Number(maxSalary)) {
      this.personalInfoForm.get('maxSalary')?.setErrors({ invalidRange: true });
    } else {
      this.personalInfoForm.get('maxSalary')?.setErrors(null);
    }
  }

  loadUserData() {
    this.isLoading = true;
    this.userService
      .findLoggedUser()
      .then((user) => {
        if (user) {
          this.user = user;
          this.userId = user._id;

          // Update component properties
          this.firstName = user.firstName || '';
          this.lastName = user.lastName || '';
          this.tagline = user.tagline || '';
          this.socialContact = user.socialContact || [];

          // Patch form with user data
          this.personalInfoForm.patchValue({
            username: user.username || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            dateOfBirth: user.dateOfBirth
              ? new Date(user.dateOfBirth).toISOString().split('T')[0]
              : '',
            gender: user.gender || '',
            maritalStatus: user.maritalStatus || '',
            languagesKnown: user.languagesKnown || [],
            currentState: user.currentState || '',
            currentCity: user.currentLocation || '',
            professionalSummary: user.professionalSummary || user.tagline || '', // Use tagline as fallback
            currentCTC: user.currentCTC || '',
            preferredCTC: user.preferredCTC || '',
            noticePeriod: user.noticePeriod || '',
            totalExp: user.totalExp || '',

            // Social links
            linkedin: this.getSocialLink(user.socialContact, 'linkedin'),
            github: this.getSocialLink(user.socialContact, 'github'),
            twitter: this.getSocialLink(user.socialContact, 'twitter'),
            portfolio: this.getSocialLink(user.socialContact, 'portfolio'),

            // AI preferences
            preferFullTime: user.preferFullTime || false,
            preferPartTime: user.preferPartTime || false,
            preferContract: user.preferContract || false,
            preferRemote: user.preferRemote || false,
            preferHybrid: user.preferHybrid || false,
            preferOnSite: user.preferOnSite || false,
            minSalary: user.minSalary || '',
            maxSalary: user.maxSalary || '',
            aiMatchingIntensity: user.aiMatchingIntensity || 'balanced',
            profileVisible: user.profileVisible !== false, // Default to true
            allowAIRecommendations: user.allowAIRecommendations !== false, // Default to true
            openToRelocate: user.openToRelocate || false,
            allowEmailNotifications: user.allowEmailNotifications !== false, // Default to true
          });

          // Check if user's location matches a popular city
          const userCity = user.currentLocation || user.currentCity || '';
          if (this.popularCities.includes(userCity)) {
            this.personalInfoForm.patchValue({ popularCity: userCity });
          }

          // Update location validation after user data is loaded
          this.updateLocationValidation();

          this.isCurrentUser = false;
          this.loadProfilePic(this.user._id);
          this.userProfileLink = `${window.location.origin}/profile-seeker/${this.user._id}`;
        }
      })
      .catch((error) => {
        console.error('Error loading user data:', error);
        this.showError('Failed to load user data. Please try again.');
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  // Profile picture methods
  onProfilePicSelected(event: any) {
    if (!this.isCurrentUser) return;

    const file = event.target.files[0];
    if (file) {
      this.uploadProfilePic(file);
    }
  }

  droppedProfilePic(files: NgxFileDropEntry[]) {
    if (!this.isCurrentUser) return;

    for (const droppedFile of files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          this.uploadProfilePic(file);
        });
      }
    }
  }

  uploadProfilePic(file: File) {
    this.isUploading = true;
    const formData = new FormData();
    formData.append('profilePic', file, file.name);
    formData.append('userId', this.userId);

    this.userService
      .uploadProfilePic(formData)
      .subscribe(
        (response) => {
          if (response.file_uploaded) {
            this.profilePicUrl = response.profilePicUrl;
            this.profilePicExist = true;
            this.closeProfilePicModal();
            this.showSuccess('Profile picture uploaded successfully!');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        },
        (error) => {
          console.error('Error uploading file:', error);
          this.showError('Failed to upload profile picture. Please try again.');
        }
      )
      .add(() => {
        this.isUploading = false;
      });
  }

  loadProfilePic(userId: string): void {
    this.userService.getProfilePic(userId).subscribe(
      (data: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.profilePicUrl = reader.result as string;
          this.profilePicExist = true;
        };
        reader.readAsDataURL(data);
      },
      (error) => {
        console.error('Error fetching profile picture:', error);
        this.profilePicUrl = this.imageUrl;
        this.profilePicExist = false;
      }
    );
  }

  // Bio management
  saveBio() {
    const professionalSummary = this.personalInfoForm.get(
      'professionalSummary'
    )?.value;
    if (!professionalSummary || !professionalSummary.trim()) {
      this.showError('Please enter a bio before saving.');
      return;
    }

    const updatedUser = { tagline: professionalSummary };
    this.isEditBioModalOpen = false;

    this.userService
      .updateUserProfile(updatedUser)
      .then(() => {
        this.showSuccess('Bio updated successfully!');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      })
      .catch((error) => {
        console.error('Error updating bio:', error);
        this.showError('Failed to update bio. Please try again.');
      });
  }

  // Form navigation and validation
  nextStep() {
    if (this.validateCurrentStep()) {
      this.currentStep++;
      this.scrollToTop();
    } else {
      this.markCurrentStepAsTouched();
    }
  }

  previousStep() {
    this.currentStep--;
    this.scrollToTop();
  }

  // AFTER:
  validateCurrentStep(): boolean {
    const currentStepControls = this.getCurrentStepControls();

    // Step 2 — all fields optional, always allow proceeding
    // if (this.currentStep === 2) {
    //   return true;
    // }

    return currentStepControls.every((controlName) => {
      const control = this.personalInfoForm.get(controlName);
      return control && !control.invalid;
    });
  }

  markCurrentStepAsTouched() {
    const currentStepControls = this.getCurrentStepControls();
    currentStepControls.forEach((controlName) => {
      const control = this.personalInfoForm.get(controlName);
      control?.markAsTouched();
    });
    this.updateFormErrors();
  }

  getCurrentStepControls(): string[] {
    switch (this.currentStep) {
      case 1:
        // Step 1: Essential Information
        return [
          'firstName',
          'lastName',
          'email',
          'phone',
          'username',
          'dateOfBirth',
        ];
      case 2:
        // Step 2: Professional Profile
        return ['gender','currentCity'];
      case 3:
        // Step 3: Job Preferences & Settings
        return ['aiMatchingIntensity'];
      default:
        return [];
    }
  }

  isStepValid(): boolean {
    return this.validateCurrentStep();
  }

  // Language management
  addLanguage(language: string) {
    if (
      language &&
      !this.personalInfoForm.value.languagesKnown.includes(language)
    ) {
      const currentLanguages = this.personalInfoForm.value.languagesKnown;
      this.personalInfoForm.patchValue({
        languagesKnown: [...currentLanguages, language],
      });
    }
  }

  removeLanguage(index: number) {
    const currentLanguages = this.personalInfoForm.value.languagesKnown;
    currentLanguages.splice(index, 1);
    this.personalInfoForm.patchValue({ languagesKnown: currentLanguages });
  }

  // Form submission
  save() {
  if (this.personalInfoForm.valid || true) {
      this.isSaving = true;
      const formValue = this.personalInfoForm.value;

      // Handle location data based on selection method
      let locationData = {};
      if (formValue.popularCity) {
        // Map popular cities to appropriate state/city values
        const cityStateMap: { [key: string]: { city: string; state: string } } =
          {
            'New Delhi': { city: 'New Delhi', state: 'DL' },
            Bengaluru: { city: 'Bengaluru', state: 'KA' },
            Mumbai: { city: 'Mumbai', state: 'MH' },
            Pune: { city: 'Pune', state: 'MH' },
            Chennai: { city: 'Chennai', state: 'TN' },
            Hyderabad: { city: 'Hyderabad', state: 'TG' },
            Gurugram: { city: 'Gurugram', state: 'HR' },
            Noida: { city: 'Noida', state: 'UP' },
            Ahmedabad: { city: 'Ahmedabad', state: 'GJ' },
            Kolkata: { city: 'Kolkata', state: 'WB' },
          };

        const location = cityStateMap[formValue.popularCity];
        if (location) {
          locationData = {
            currentState: location.state,
            currentCity: location.city,
          };
        }
      }

      // Prepare social contact array
      const socialContact = [];
      if (formValue.linkedin)
        socialContact.push({ socialtype: 'linkedin', url: formValue.linkedin });
      if (formValue.github)
        socialContact.push({ socialtype: 'github', url: formValue.github });
      if (formValue.twitter)
        socialContact.push({ socialtype: 'twitter', url: formValue.twitter });
      if (formValue.portfolio)
        socialContact.push({
          socialtype: 'portfolio',
          url: formValue.portfolio,
        });

      // Prepare job preferences
      const preferredJobTypes = [];
      if (formValue.preferFullTime) preferredJobTypes.push('Full-time');
      if (formValue.preferPartTime) preferredJobTypes.push('Part-time');
      if (formValue.preferContract) preferredJobTypes.push('Contract');
      if (formValue.preferRemote) preferredJobTypes.push('Remote');
      if (formValue.preferHybrid) preferredJobTypes.push('Hybrid');
      if (formValue.preferOnSite) preferredJobTypes.push('On-site');

      const updatedUser = {
        ...formValue,
        ...locationData,
        socialContact,
        preferredJobTypes,
        tagline: formValue.professionalSummary, // Map professionalSummary to tagline for backend compatibility
      };

      this.userService
        .updateUserProfile(updatedUser)
        .then(() => {
          this.editMode = false;
          this.showSuccess('Profile updated successfully!');
          // setTimeout(() => {
          //   window.location.reload();
          // }, 1000);
        })
        .catch((error) => {
          console.error('Update error:', error);
          this.showError('Failed to update profile. Please try again.');
        })
        .finally(() => {
          this.isSaving = false;
        });
    } else {
      this.personalInfoForm.markAllAsTouched();
      this.updateFormErrors();
      this.showError('Please fix the errors in the form before saving.');
    }
  }

  // UI helper methods
  edit() {
    this.editMode = true;
    this.currentStep = 1;
  }

  cancel() {
    this.editMode = false;
    this.currentStep = 1;
    this.formErrors = {};
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    this.currentStep = 1;
    this.formErrors = {};
  }

  goToStep(step: number) {
    // Allow navigation only if current step is valid or going backwards
    if (step < this.currentStep || this.validateCurrentStep()) {
      this.currentStep = step;
      this.scrollToTop();
    } else {
      this.markCurrentStepAsTouched();
      this.showError('Please complete the current step before proceeding.');
    }
  }

  toggleLanguage(language: string) {
    const languagesControl = this.personalInfoForm.get('languagesKnown');
    const currentLanguages: string[] = languagesControl?.value || [];
    
    const index = currentLanguages.indexOf(language);
    if (index > -1) {
      // Remove language
      currentLanguages.splice(index, 1);
    } else {
      // Add language
      currentLanguages.push(language);
    }
    
    languagesControl?.setValue(currentLanguages);
  }

  isLanguageSelected(language: string): boolean {
    const languagesControl = this.personalInfoForm.get('languagesKnown');
    const currentLanguages: string[] = languagesControl?.value || [];
    return currentLanguages.includes(language);
  }

  editBio() {
    this.editModemodal = true;
  }

  cancelmodal() {
    this.editMode = false;
    this.isEditBioModalOpen = false;
  }

  openProfilePicModal() {
    this.isProfilePicModalOpen = true;
    this.dropdownOpen = false;
  }

  closeProfilePicModal() {
    this.isProfilePicModalOpen = false;
  }

  toggleDropdown() {
    if (this.isCurrentUser) {
      this.dropdownOpen = !this.dropdownOpen;
    }
  }

  openEditBioModal() {
    this.isEditBioModalOpen = true;
    this.dropdownOpen = false;
  }

  closeEditBioModal() {
    this.isEditBioModalOpen = false;
  }

  checkHidden(url: string): boolean {
    return !url;
  }

  shareProfile(): void {
    this.shareModal.openShareModal();
  }

  getSocialLink(socialContact: any[], type: string): string {
    return socialContact?.find((s) => s.socialtype === type)?.url || '';
  }

  toggleStatus() {
    this.isJobSeeking = !this.isJobSeeking;
    // Note: Backend update not implemented yet - only updating local state
    this.showSuccess(
      `Job seeking status ${this.isJobSeeking ? 'enabled' : 'disabled'}`
    );
  }

  // Utility methods
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // AFTER:
  showSuccess(message: string) {
    this.toastrService.success(message);
  }

  showError(message: string) {
    this.toastrService.error(message);
  }

  // Helper method to check if user has existing location data
  hasExistingLocation(): boolean {
    return !!(
      this.user?.currentLocation ||
      this.user?.currentCity ||
      this.user?.currentState
    );
  }

  // Location validation method
  validateLocation(): boolean {
    // Check if user already has location data
    if (this.hasExistingLocation()) {
      return true;
    }

    // Otherwise, require popularCity to be selected
    return !!this.personalInfoForm.get('popularCity')?.value;
  }

  // Update location validation based on current method
  updateLocationValidation() {
    // Check if user already has location data
    if (this.hasExistingLocation()) {
      // If user has existing location, make popularCity optional
      this.personalInfoForm.get('popularCity')?.clearValidators();
    } else {
      // If user doesn't have location data, make popularCity required
      this.personalInfoForm
        .get('popularCity')
        ?.setValidators([Validators.required]);
    }

    this.personalInfoForm.get('currentState')?.clearValidators();
    this.personalInfoForm.get('currentCity')?.clearValidators();
    this.personalInfoForm.get('popularCity')?.updateValueAndValidity();
    this.personalInfoForm.get('currentState')?.updateValueAndValidity();
    this.personalInfoForm.get('currentCity')?.updateValueAndValidity();
  }

  // Enhanced language methods with API integration
  searchLanguages(searchTerm: string) {
    this.languageSearchTerm = searchTerm;
    if (searchTerm.trim().length === 0) {
      // Show popular languages when no search term
      this.filteredLanguages = this.getPopularLanguages();
      return;
    }

    // Filter existing language list
    const term = searchTerm.toLowerCase();
    this.filteredLanguages = this.languageList.filter(lang => 
      lang.toLowerCase().includes(term)
    ).slice(0, 10); // Limit to 10 results
  }

  getPopularLanguages(): string[] {
    // Most common languages worldwide and in India
    return [
      'English',
      'Hindi',
      'Spanish',
      'French',
      'German',
      'Chinese (Mandarin)',
      'Arabic',
      'Portuguese',
      'Russian',
      'Japanese',
      'Bengali',
      'Tamil',
      'Telugu',
      'Marathi',
      'Gujarati',
      'Kannada',
      'Malayalam',
      'Punjabi',
      'Urdu',
      'Odia'
    ].filter(lang => this.languageList.includes(lang));
  }

  addLanguageFromSearch() {
    if (this.languageSearchTerm.trim()) {
      const language = this.languageSearchTerm.trim();
      const languagesControl = this.personalInfoForm.get('languagesKnown');
      const currentLanguages: string[] = languagesControl?.value || [];
      
      if (!currentLanguages.includes(language)) {
        currentLanguages.push(language);
        languagesControl?.setValue(currentLanguages);
      }
      
      // Reset search
      this.languageSearchTerm = '';
      this.filteredLanguages = [];
      this.showLanguageDropdown = false;
    }
  }

  selectLanguageFromDropdown(language: string) {
    const languagesControl = this.personalInfoForm.get('languagesKnown');
    const currentLanguages: string[] = languagesControl?.value || [];
    
    if (!currentLanguages.includes(language)) {
      currentLanguages.push(language);
      languagesControl?.setValue(currentLanguages);
    }
    
    // Reset search
    this.languageSearchTerm = '';
    this.filteredLanguages = [];
    this.showLanguageDropdown = false;
  }

  removeSelectedLanguage(language: string) {
    const languagesControl = this.personalInfoForm.get('languagesKnown');
    const currentLanguages: string[] = languagesControl?.value || [];
    const index = currentLanguages.indexOf(language);
    
    if (index > -1) {
      currentLanguages.splice(index, 1);
      languagesControl?.setValue(currentLanguages);
    }
  }

  getSelectedLanguages(): string[] {
    return this.personalInfoForm.get('languagesKnown')?.value || [];
  }
}
