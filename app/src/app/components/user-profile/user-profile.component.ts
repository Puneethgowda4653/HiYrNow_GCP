import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { ResumeUploadService } from 'src/app/services/resume-upload.service';
import { UserService } from 'src/app/services/user.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AutosaveService, AutosaveState } from 'src/app/services/autosave.service';
import { UiToastService } from 'src/app/ui/toast.service';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProfileStepperComponent, ProfileStep } from '../profile-stepper/profile-stepper.component';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
})
export class UserProfileComponent implements OnInit, OnDestroy {
  // Core data
  user: any = null;
  isLoading: boolean = true;
  isCurrentUser: boolean = false;
  requestedUserId: string | null = null;

  // Profile data
  education: any[] = [];
  experiences: any[] = [];
  projects: any[] = [];
  skills: any[] = [];
  awards: any[] = [];

  // UI state
  currentStep: number = 0;
  isDesktop: boolean = false;
  isSidebarOpen: boolean = false; // Mobile sidebar toggle
  isProfilePicModalOpen = false;
  profilePicUrl: string = '';
  profilePicExist = false;
  coverPhotoUrl: string = '';
  isCoverUploading: boolean = false;
  showResumeModal: boolean = false;
  showPreviewModal: boolean = false; // Preview modal toggle
  openToJobs: boolean = false;
  isSubmitting: boolean = false; // Prevent duplicate submissions
  showPersonalInfo: boolean = false; // Toggle personal info visibility
  isChangingStep: boolean = false; // Prevent rapid step changes
  private stepChangeDebounceTimer: any = null;

  // Form steps
  steps: ProfileStep[] = [
    { id: 'personal', label: 'Overview', icon: 'fa-user', completed: false, disabled: false },
    { id: 'experience', label: 'Experience', icon: 'fa-briefcase', completed: false, disabled: false },
    { id: 'education', label: 'Education', icon: 'fa-graduation-cap', completed: false, disabled: false },
    { id: 'skills', label: 'Skills ', icon: 'fa-certificate', completed: false, disabled: false },
    { id: 'attachments', label: 'Projects & Achievements', icon: 'fa-paperclip', completed: false, disabled: false },
    { id: 'preview', label: 'Preview & Publish', icon: 'fa-eye', completed: false, disabled: false }
  ];

  // Autosave state
  autosaveState: AutosaveState | null = null;
  private autosaveSubscription?: Subscription;
  private saveSubject = new Subject<any>();
  private subscriptions: Subscription[] = [];
  private breakpointSubscription?: Subscription;

  @ViewChild('stepper') stepper?: ProfileStepperComponent;

  constructor(
    private userService: UserService,
    private breakpointObserver: BreakpointObserver,
    private route: ActivatedRoute,
    private resumeUploadService: ResumeUploadService,
    private autosaveService: AutosaveService,
    private toastService: UiToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Setup breakpoint observer
    this.breakpointSubscription = this.breakpointObserver
      .observe([Breakpoints.Medium, Breakpoints.Large, Breakpoints.XLarge])
      .subscribe((result) => {
        this.isDesktop = result.matches;
        // Auto-open sidebar on desktop, closed on mobile
        if (this.isDesktop) {
          this.isSidebarOpen = true;
        }
        this.cdr.detectChanges();
      });

    // Setup autosave
    this.setupAutosave();

    // Load user profile
    this.loadUserProfile();

    // Handle scroll position on mobile
    this.setupMobileScrollHandling();
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.breakpointSubscription?.unsubscribe();
    this.autosaveSubscription?.unsubscribe();
    this.autosaveService.unregister('user-profile');
    this.saveSubject.complete();

    // Clear any pending step change timers
    if (this.stepChangeDebounceTimer) {
      clearTimeout(this.stepChangeDebounceTimer);
      this.stepChangeDebounceTimer = null;
    }
  }

  private setupAutosave(): void {
    // Register autosave for profile updates
    this.autosaveSubscription = this.autosaveService.register(
      'user-profile',
      async (data: any) => {
        try {
          const response = await this.userService.updateUserProfile(data);
          return response;
        } catch (error) {
          console.error('Autosave failed:', error);
          throw error;
        }
      },
      500 // 500ms debounce
    ).subscribe((state) => {
      this.autosaveState = state;
      if (state.hasError) {
        this.toastService.autosave(false);
      }
    });

    // Setup periodic autosave (every 5 seconds)
    const periodicSave = this.autosaveService.startPeriodicSave(
      'user-profile',
      () => this.getProfileDataForSave(),
      5000
    );
    this.subscriptions.push(periodicSave);

    // Setup form change detection with debounce
    const formChanges = this.saveSubject.pipe(
      debounceTime(500),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe((data) => {
      this.autosaveService.triggerSave('user-profile', data);
    });
    this.subscriptions.push(formChanges);
  }

  private getProfileDataForSave(): any {
    if (!this.user) return null;
    return {
      tagline: this.user.tagline,
      openToJobs: this.openToJobs,
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      email: this.user.email,
      phone: this.user.phone,
      currentCity: this.user.currentCity,
    };
  }

  loadUserProfile(): void {
    const userId = this.getRequestedUserId();
    if (!userId) {
      this.isLoading = false;
      return;
    }

    // Ensure loading state is set and prevent interactions
    this.isLoading = true;
    this.isChangingStep = false; // Reset step changing flag
    this.cdr.detectChanges();

    const profileSub = this.userService.getUserDetails(userId).subscribe({
      next: (userData) => {
        if (userData?.status === 'success' && userData.data?.user) {
          // Use setTimeout to ensure data is set before UI updates
          setTimeout(() => {
            this.user = userData.data.user;
            this.education = userData.data.education || [];
            this.experiences = userData.data.experiences || [];
            this.projects = userData.data.project || [];
            this.skills = userData.data.skill || [];
            this.awards = userData.data.award || userData.data.awards || [];
            this.openToJobs = this.user.openToJobs ?? false;

            // Load profile picture
            // Load profile picture
            this.loadProfilePic(this.user._id);

            // Load cover photo if saved
            if (this.user.coverPhotoUrl) {
              const base = location.hostname === 'localhost' ? 'https://hiyrnow-backend-786443796056.europe-west1.run.app' : '';
              this.coverPhotoUrl = this.user.coverPhotoUrl.startsWith('http')
                ? this.user.coverPhotoUrl
                : base + this.user.coverPhotoUrl;
            }

            // Check if current user
            const currentUserSub = this.userService.getCurrentUser().subscribe((currentUser) => {
              this.isCurrentUser = currentUser === this.user?._id;
              // if (this.isCurrentUser && !this.user.resumeUrl) {
              //   this.showResumeModal = true;
              // }
              // Update step completion after loading data
              // Use requestAnimationFrame to ensure DOM is ready before allowing interactions
              requestAnimationFrame(() => {
                this.updateStepCompletion();
                // Add a small delay to ensure all components are initialized
                setTimeout(() => {
                  this.isLoading = false;
                  this.cdr.detectChanges();
                }, 200); // Increased from 100ms to ensure components are ready
              });
            });
            this.subscriptions.push(currentUserSub);
          }, 0);
        } else {
          console.error('Invalid response structure:', userData);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.isLoading = false;
        this.toastService.error('Failed to load profile. Please refresh the page.');
        this.cdr.detectChanges();
      },
    });
    this.subscriptions.push(profileSub);
  }

  getRequestedUserId(): string | null {
    this.requestedUserId = this.route.snapshot.paramMap.get('userId');
    return this.requestedUserId;
  }

  loadProfilePic(userId: string): void {
    const picSub = this.userService.getProfilePic(userId).subscribe({
      next: (data: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const text = reader.result as string;
            const json = JSON.parse(text);
            if (json && json.message === 'No profile picture for user') {
              this.profilePicExist = false;
              this.profilePicUrl = '';
              this.cdr.detectChanges();
              return;
            }
          } catch (e) {
            // Not JSON, so treat as image
            const imageReader = new FileReader();
            imageReader.onload = () => {
              // Add cache-busting parameter to ensure fresh image
              const cacheBuster = '?t=' + new Date().getTime();
              const base64Url = imageReader.result as string;
              // If it's already a data URL, use it directly; otherwise add cache buster
              this.profilePicUrl = base64Url.includes('data:') ? base64Url : base64Url + cacheBuster;

              this.profilePicExist = true;
              this.cdr.detectChanges();
            };
            imageReader.readAsDataURL(data);
          }
        };
        reader.readAsText(data);
      },
      error: (error) => {
        console.error('Error fetching profile picture:', error);
        this.profilePicExist = false;
        this.profilePicUrl = '';
        this.cdr.detectChanges();
      },
    });
    this.subscriptions.push(picSub);
  }

  // Step navigation with guards and debouncing
  onStepChange(stepIndex: number): void {
    // Guard: Prevent step changes if data is still loading
    if (this.isLoading) {
      this.toastService.warning('Please wait while profile data loads...');
      return;
    }

    // Guard: Prevent rapid successive clicks
    if (this.isChangingStep) {
      return;
    }

    // Guard: Validate step index
    if (stepIndex < 0 || stepIndex >= this.steps.length) {
      return;
    }

    // Guard: Prevent changing to the same step
    if (stepIndex === this.currentStep) {
      return;
    }

    // Guard: Ensure essential data is loaded before allowing step change
    if (!this.user) {
      this.toastService.warning('Profile data is not ready yet. Please wait...');
      return;
    }

    // Clear any pending step change
    if (this.stepChangeDebounceTimer) {
      clearTimeout(this.stepChangeDebounceTimer);
    }

    // Set changing flag immediately
    this.isChangingStep = true;

    // Use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
      try {
        // Update step immediately
        this.currentStep = stepIndex;

        // Close sidebar on mobile after step change
        if (!this.isDesktop) {
          this.isSidebarOpen = false;
        }

        // Re-fetch data to reflect any saves made in child components
        this.refreshProfileData();

        // Trigger change detection
        this.cdr.detectChanges();

        // Scroll after render (use another frame for smooth scroll)
        requestAnimationFrame(() => {
          this.scrollToTop();

          // Reset changing flag after a minimal delay
          this.stepChangeDebounceTimer = setTimeout(() => {
            this.isChangingStep = false;
            this.cdr.detectChanges();
          }, 150); // Reduced from 300ms
        });
      } catch (error) {
        console.error('Error changing step:', error);
        this.toastService.error('Failed to change step. Please try again.');
        this.isChangingStep = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Toggle sidebar visibility (mobile only)
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Toggle personal info visibility
  togglePersonalInfo(): void {
    if (this.isCurrentUser) {
      this.showPersonalInfo = !this.showPersonalInfo;
      this.cdr.detectChanges();
    }
  }

  // Smooth scroll to top with mobile optimization
  private scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: this.isDesktop ? 'smooth' : 'auto' // Instant scroll on mobile for better performance
      });
    }
  }

  // Setup mobile-specific scroll handling
  private setupMobileScrollHandling(): void {
    if (typeof window === 'undefined') return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      lastScrollY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Close sidebar when scrolling on mobile
          if (!this.isDesktop && this.isSidebarOpen && lastScrollY > 100) {
            this.isSidebarOpen = false;
            this.cdr.detectChanges();
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup on destroy
    this.subscriptions.push({
      unsubscribe: () => window.removeEventListener('scroll', handleScroll)
    } as Subscription);
  }

  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.onStepChange(this.currentStep + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.onStepChange(this.currentStep - 1);
    }
  }

  // Profile picture methods
  openProfilePicModal(): void {
    if (this.isCurrentUser) {
      this.isProfilePicModalOpen = true;
      // Prevent body scroll on mobile when modal is open
      if (!this.isDesktop && typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
      this.cdr.detectChanges();
    }
  }

  onCoverPhotoSelected(event: any): void {
    if (!this.isCurrentUser || this.isCoverUploading) return;

    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastService.error('Please select an image file');
      return;
    }

    // Cover photos: 10MB limit (larger than profile pic since it's a banner)
    if (file.size > 10 * 1024 * 1024) {
      this.toastService.error('Cover image size should be less than 10MB');
      return;
    }

    this.isCoverUploading = true;

    // Preview immediately while uploading
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.coverPhotoUrl = e.target.result;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('coverPhoto', file, file.name);
    formData.append('userId', this.user._id);

    const uploadSub = this.userService.uploadCoverPhoto(formData).subscribe({
      next: (response: any) => {
        if (response.file_uploaded || response.success) {
          const base = location.hostname === 'localhost' ? 'https://hiyrnow-backend-786443796056.europe-west1.run.app' : '';
          const rawUrl = response.coverPhotoUrl || response.url || '';
          this.coverPhotoUrl = rawUrl.startsWith('http') ? rawUrl : base + rawUrl;
          if (this.user) this.user.coverPhotoUrl = this.coverPhotoUrl; // persist in memory
          this.toastService.success('Cover photo updated successfully');
        }
        this.isCoverUploading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Cover photo upload failed:', error);
        this.toastService.error('Failed to upload cover photo. Please try again.');
        this.isCoverUploading = false;
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.push(uploadSub);
  }

  onProfilePicSelected(event: any): void {
    if (!this.isCurrentUser || this.isSubmitting) return;

    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.error('Image size should be less than 5MB');
      return;
    }

    // Check file dimensions for better mobile experience
    this.validateImageDimensions(file).then((isValid) => {
      if (!isValid) {
        this.toastService.warning('Image dimensions are too large. Consider using a smaller image for better performance.');
      }
      this.uploadProfilePicture(file);
    });
  }



  // Validate image dimensions
  private validateImageDimensions(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          // Recommend max 2048x2048 for mobile optimization
          const isValid = img.width <= 2048 && img.height <= 2048;
          resolve(isValid);
        };
        img.onerror = () => resolve(true); // If error, proceed anyway
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(true); // If error, proceed anyway
      reader.readAsDataURL(file);
    });
  }

  // Upload profile picture (extracted for better code organization)
  private uploadProfilePicture(file: File): void {
    this.isSubmitting = true;
    const formData = new FormData();
    formData.append('profilePic', file, file.name);
    formData.append('userId', this.user._id);

    const uploadSub = this.userService.uploadProfilePic(formData).subscribe({
      next: (response: any) => {
        if (response.file_uploaded) {
          // Clear the current image to force reload
          this.profilePicUrl = '';

          // Reload the profile picture from server immediately to ensure fresh image
          // Use setTimeout to ensure the clear happens first, then reload
          setTimeout(() => {
            this.loadProfilePic(this.user._id);
          }, 100);

          this.profilePicExist = true;

          this.closeProfilePicModal();
          this.toastService.success('Profile picture uploaded successfully');
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        const errorMessage = error?.error?.message || 'Failed to upload profile picture. Please try again.';
        this.toastService.error(errorMessage);
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
    this.subscriptions.push(uploadSub);
  }

  droppedProfilePic(files: NgxFileDropEntry[]): void {
    if (!this.isCurrentUser || this.isSubmitting) return;

    for (const droppedFile of files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          // Create a synthetic event for consistency
          const event = { target: { files: [file] } };
          this.onProfilePicSelected(event);
        });
        break; // Only handle first file
      }
    }
  }

  // Open to jobs toggle
  toggleOpenToJobs(): void {
    if (!this.isCurrentUser || this.isSubmitting) return;

    const previousState = this.openToJobs;
    this.openToJobs = !this.openToJobs;
    const updateData = { openToJobs: this.openToJobs };

    this.isSubmitting = true;
    this.userService.updateUserProfile(updateData).then(
      (response) => {
        this.isSubmitting = false;
        if (response && response.status === 'success') {
          this.toastService.success(
            this.openToJobs
              ? '✓ You are now open to job opportunities'
              : 'You are no longer open to job opportunities'
          );
          // Trigger haptic feedback on mobile (if supported)
          this.triggerHapticFeedback();
          this.cdr.detectChanges();
        } else {
          // Revert on failure
          this.openToJobs = previousState;
          this.toastService.error('Failed to update work status. Please try again.');
          this.cdr.detectChanges();
        }
      },
      (error) => {
        this.isSubmitting = false;
        this.openToJobs = previousState;
        const errorMessage = error?.error?.message || 'Failed to update work status. Please try again.';
        this.toastService.error(errorMessage);
        this.cdr.detectChanges();
      }
    );
  }

  // Trigger haptic feedback for better mobile UX (if supported)
  private triggerHapticFeedback(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration for feedback
    }
  }

  // Publish profile
  async publishProfile(): Promise<void> {
    // Prevent duplicate submissions
    if (!this.isCurrentUser || this.isSubmitting) {
      return;
    }

    // Validate required steps are completed (excluding attachments step which is optional)
    const requiredSteps = this.steps.filter((step, index) =>
      index < 5 && step.id !== 'attachments' && !step.completed
    );
    if (requiredSteps.length > 0) {
      this.toastService.warning('⚠ Please complete all required profile sections before publishing');
      const firstIncomplete = this.steps.findIndex(step =>
        !step.completed && step.id !== 'preview' && step.id !== 'attachments'
      );
      if (firstIncomplete !== -1) {
        this.currentStep = firstIncomplete;
        this.scrollToTop();
      }
      return;
    }

    this.isSubmitting = true;
    try {
      // Trigger final save
      const profileData = this.getProfileDataForSave();
      const saved = await this.autosaveService.manualSave('user-profile', profileData);

      if (saved) {
        this.toastService.success('🎉 Profile published successfully!');
        this.steps[5].completed = true;
        this.updateStepCompletion();
        this.triggerHapticFeedback();
        // Refresh data to reflect published status
        this.refreshProfileData();
        this.cdr.detectChanges();
      } else {
        this.toastService.error('Failed to publish profile. Please try again.');
      }
    } catch (error) {
      console.error('Error publishing profile:', error);
      const errorMessage = (error as any)?.error?.message || 'Failed to publish profile. Please try again.';
      this.toastService.error(errorMessage);
    } finally {
      // Use setTimeout to ensure state is reset even if there's an error
      setTimeout(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }, 1000);
    }
  }

  // Preview profile
  previewProfile(): void {
    // Close sidebar on mobile for cleaner preview
    if (!this.isDesktop) {
      this.isSidebarOpen = false;
    }
    // Open preview modal
    this.showPreviewModal = true;
    // Prevent body scroll on mobile when modal is open
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    this.cdr.detectChanges();
  }

  // Close preview modal
  closePreviewModal(): void {
    this.showPreviewModal = false;
    // Restore body scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    this.cdr.detectChanges();
  }

  // Get profile data for preview
  getPreviewProfileData(): any {
    return {
      personalDetails: {
        firstName: this.user?.firstName || '',
        lastName: this.user?.lastName || '',
        professionalSummary: this.user?.tagline || this.user?.bio || '',
        currentCity: this.user?.currentCity || '',
        currentState: this.user?.currentState || '',
        linkedin: this.user?.linkedin || '',
        github: this.user?.github || '',
        portfolio: this.user?.portfolio || '',
        resumeUrl: this.user?.resumeUrl || '',
      },
      user: {
        profilePicture: this.profilePicUrl || '',
        resumeUrl: this.user?.resumeUrl || '',
      },
      skills: this.skills || [],
      experience: this.experiences || [],
      education: this.education || [],
      projects: this.projects || [],
      awards: this.awards || [],
      achievements: this.awards || [],
    };
  }

  // Utility methods
  getSocialIcon(platform: string): string {
    const icons: { [key: string]: string } = {
      linkedin: 'fa-brands fa-linkedin text-blue-600',
      github: 'fa-brands fa-github text-gray-800',
      twitter: 'fa-brands fa-x-twitter text-black',
      facebook: 'fa-brands fa-facebook text-blue-600',
      instagram: 'fa-brands fa-instagram text-pink-500',
    };
    return icons[platform.toLowerCase()] || 'fa-solid fa-link';
  }

  closeResumeModal(): void {
    this.showResumeModal = false;
    this.cdr.detectChanges();
  }

  // Close profile picture modal (override to restore scroll)
  closeProfilePicModal(): void {
    this.isProfilePicModalOpen = false;
    // Restore body scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    this.cdr.detectChanges();
  }

  // Handle form data changes (trigger autosave)
  // This method can be called by child components or triggered automatically
  onFormDataChange(data?: any): void {
    if (data) {
      this.saveSubject.next(data);
    }
    // Update step completion after a short delay to allow data to be saved
    setTimeout(() => {
      this.updateStepCompletion();
    }, 1000);
  }

  // Get current step ID
  get currentStepId(): string {
    return this.steps[this.currentStep]?.id || 'personal';
  }

  // Update step completion status
  updateStepCompletion(): void {
    if (!this.user) return;

    // Update step completion based on data
    this.steps[0].completed = !!(this.user?.firstName && this.user?.lastName && this.user?.email);
    this.steps[1].completed = this.experiences && this.experiences.length > 0;
    this.steps[2].completed = this.education && this.education.length > 0;
    this.steps[3].completed = this.skills && this.skills.length > 0;
    // Attachments step - mark as completed only if user has added projects (but it's optional)
    this.steps[4].completed = (this.projects && this.projects.length > 0) || (this.awards && this.awards.length > 0);
    // Preview step - all required steps completed (excluding optional attachments)
    this.steps[5].completed = this.steps.slice(0, 4).every(step => step.completed);

    // Update disabled state for steps - don't disable optional steps
    this.steps.forEach((step, index) => {
      // Don't disable the attachments step since it's optional
      if (step.id === 'attachments') {
        step.disabled = false;
      } else {
        step.disabled = index > this.currentStep && !step.completed;
      }
    });

    this.cdr.detectChanges();
  }

  // Refresh profile data (used after significant changes)
  refreshProfileData(): void {
    const userId = this.getRequestedUserId();
    if (!userId || this.isLoading || this.isChangingStep) return;

    // Temporarily block interactions during refresh
    const wasChangingStep = this.isChangingStep;
    this.isChangingStep = true;
    this.cdr.detectChanges();

    const refreshSub = this.userService.getUserDetails(userId).subscribe({
      next: (userData) => {
        if (userData?.status === 'success' && userData.data?.user) {
          setTimeout(() => {
            this.user = userData.data.user;
            this.education = userData.data.education || [];
            this.experiences = userData.data.experiences || [];
            this.projects = userData.data.project || [];
            this.skills = userData.data.skill || [];
            this.awards = userData.data.award || userData.data.awards || [];
            this.updateStepCompletion();

            // Restore interaction state
            setTimeout(() => {
              this.isChangingStep = wasChangingStep;
              this.cdr.detectChanges();
            }, 100);
          }, 0);
        } else {
          this.isChangingStep = wasChangingStep;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error refreshing profile data:', error);
        this.isChangingStep = wasChangingStep;
        this.cdr.detectChanges();
      },
    });
    this.subscriptions.push(refreshSub);
  }

  // Calculate profile completeness percentage
  getProfileCompleteness(): number {
    let completeness = 0;
    const weights = {
      basicInfo: 25,      // Name, email, location (increased from 20)
      tagline: 10,        // Professional tagline/bio (increased from 5)
      experience: 25,     // At least one experience (increased from 20)
      education: 20,      // At least one education (increased from 15)
      skills: 20,         // At least 3 skills (increased from 15)
      resume: 10,         // Resume uploaded (optional bonus)
      projects: 10,       // At least one project (optional bonus)
      awards: 5           // Awards/achievements (optional bonus)
    };

    // Required fields total to 100%
    const requiredTotal = weights.basicInfo + weights.tagline + weights.experience + weights.education + weights.skills;

    // Basic info (name, email)
    if (this.user?.firstName && this.user?.lastName && this.user?.email) {
      completeness += weights.basicInfo;
    }

    // Tagline/Professional summary
    if (this.user?.tagline && this.user.tagline.trim().length > 0) {
      completeness += weights.tagline;
    }

    // Experience
    if (this.experiences && this.experiences.length > 0) {
      completeness += weights.experience;
    }

    // Education
    if (this.education && this.education.length > 0) {
      completeness += weights.education;
    }

    // Skills (at least 3 for full credit)
    if (this.skills && this.skills.length >= 3) {
      completeness += weights.skills;
    } else if (this.skills && this.skills.length > 0) {
      // Partial credit for having some skills
      completeness += Math.floor(weights.skills * (this.skills.length / 3));
    }

    // Optional bonuses (don't count towards required 100%)
    // Resume (optional bonus - can exceed 100%)
    if (this.user?.resumeUrl) {
      completeness += weights.resume;
    }

    // Projects (optional bonus - can exceed 100%)
    if (this.projects && this.projects.length > 0) {
      completeness += weights.projects;
    }

    // Awards/Achievements (optional bonus - can exceed 100%)
    if (this.awards && this.awards.length > 0) {
      completeness += weights.awards;
    }

    // Cap at 100% for display
    return Math.min(Math.round(completeness), 100);
  }

  // Get missing profile sections for user feedback
  getMissingProfileSections(): string[] {
    const missing: string[] = [];

    if (!this.user?.firstName || !this.user?.lastName || !this.user?.email) {
      missing.push('Basic Information');
    }

    if (!this.user?.tagline || this.user.tagline.trim().length === 0) {
      missing.push('Professional Tagline');
    }

    if (!this.experiences || this.experiences.length === 0) {
      missing.push('Work Experience');
    }

    if (!this.education || this.education.length === 0) {
      missing.push('Education');
    }

    if (!this.skills || this.skills.length < 3) {
      missing.push(`Skills (${this.skills?.length || 0}/3)`);
    }

    // Projects, resume, and achievements are now optional - not included in missing sections

    return missing;
  }

  // Get count of completed steps
  getCompletedStepsCount(): number {
    return this.steps.filter((step, i) => step.completed && i !== 4).length;
  }

  // Get count of remaining steps
  getRemainingStepsCount(): number {
    return this.steps.filter((step, i) => !step.completed && i !== 4).length;
  }
}
