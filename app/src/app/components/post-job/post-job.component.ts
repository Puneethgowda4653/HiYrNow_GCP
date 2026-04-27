import DOMPurify from 'dompurify';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  FormControl,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { JobPostingService } from '../../services/job-posting.service';
import { UserService } from '../../services/user.service';
import { RecruiterDetailService } from '../../services/recruiter-detail.service';
import { JobPostingModelClient } from '../../models/job-posting.model.client';
import {
  AIJobPostingService,
  AIJobGenerationResponse,
} from '../../services/ai-job-posting.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { fadeIn, fadeInUp, fadeInDown, scaleIn, slideInLeft } from '../../shared/animations';
import { UiToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-post-job',
  templateUrl: './post-job.component.html',
  styleUrls: ['./post-job.component.css'],
  animations: [fadeIn, fadeInUp, fadeInDown, scaleIn, slideInLeft]
})
export class PostJobComponent implements OnInit, OnDestroy {
  jobForm!: FormGroup;
  @ViewChild('locationInput') locationInput!: ElementRef<HTMLInputElement>;
  currentStep = 1;
  user: any;
  companyLogo: string = '/assets/default-logo.png';
  postingAsClient: boolean = false;
  companyName: string = '';
  company_url: string = '';
  isCompanyProfileComplete = true;
  companyProfileMissingFields: string[] = [];
  hasShownCompanyProfileWarning = false;
  showAIGenerator = false;
  private keydownHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.showAIGenerator) {
      this.closeAIGenerator();
    }
  };
  isEnhancingDescription = false;
  jobId: string | null = null;
  isEditMode: boolean = false;
  // Properties for location selection
  filteredCities!: Observable<string[]>;
  selectedLocations: string[] = [];
  allCities: string[] = [
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Ahmedabad',
    'Jaipur',
    'Lucknow',
    'Kanpur',
    'Nagpur',
    'Indore',
    'Thane',
    'Bhopal',
    'Visakhapatnam',
    'Pimpri-Chinchwad',
    'Patna',
    'Vadodara',
    'Ghaziabad',
    'Ludhiana',
    'Agra',
    'Nashik',
    'Faridabad',
    'Meerut',
    'Rajkot',
    'Kalyan-Dombivli',
    'Vasai-Virar',
    'Varanasi',
    'Srinagar',
    'Aurangabad',
    'Dhanbad',
    'Amritsar',
    'Navi Mumbai',
    'Allahabad',
    'Ranchi',
    'Howrah',
    'Coimbatore',
    'Jabalpur',
    'Gwalior',
    'Vijayawada',
    'Jodhpur',
    'Madurai',
    'Raipur',
    'Kota',
    'Guwahati',
    'Chandigarh',
    'Solapur',
    'Hubli-Dharwad',
    'Mysore',
    'Tiruchirappalli',
    'Bareilly',
    'Aligarh',
    'Tiruppur',
    'Gurgaon',
    'Moradabad',
    'Jalandhar',
    'Bhubaneswar',
    'Salem',
    'Warangal',
    'Mira-Bhayandar',
    'Thiruvananthapuram',
    'Bhiwandi',
    'Saharanpur',
    'Guntur',
    'Amravati',
    'Bikaner',
    'Noida',
    'Jamshedpur',
  ];
  locationControl = new FormControl('');
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean'],
    ],
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private jobPostService: JobPostingService,
    private userService: UserService,
    private recruiterService: RecruiterDetailService,
    private aiService: AIJobPostingService,
    private toast: UiToastService
  ) {}

  ngOnInit() {
    // Check if we're in edit mode
    this.jobId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.jobId;
    
    this.initForm();
    this.loadUserData();
    this.setupCityAutocomplete();
    this.setupKeyboardListeners();
    
    // Load job data if editing
    if (this.isEditMode && this.jobId) {
      this.loadJobPosting();
    }
  }

  initForm() {
    this.jobForm = this.fb.group({
      title: ['', Validators.required],
      locationType: ['', Validators.required],
      location: ['', Validators.required],
      type: ['', Validators.required],
      description: ['', Validators.required],
      company: [''],
      company_logo: [''],
      minQualification: ['', Validators.required],
      company_url: [''],
      minSalary: [null, [Validators.min(0)]],
      maxSalary: [null, [Validators.min(0)]],
      minExp: [null, [Validators.required, Validators.min(0)]],
      maxExp: [null, [Validators.required, Validators.min(0)]],
      status: ['active'],
      coreSkills: this.fb.array([]),

      // Add customQuestions FormArray
      // ✅ AFTER
      customQuestions: this.fb.array([]),
    }, { validators: this.rangeValidator });
  }

  private rangeValidator(group: any) {
    const minExp = group.get('minExp')?.value;
    const maxExp = group.get('maxExp')?.value;
    const minSal = group.get('minSalary')?.value;
    const maxSal = group.get('maxSalary')?.value;
    const errors: any = {};
    if (minExp !== null && maxExp !== null && maxExp < minExp) {
      errors['expRange'] = true;
    }
    if (minSal && maxSal && maxSal < minSal) {
      errors['salaryRange'] = true;
    }
    return Object.keys(errors).length ? errors : null;
  }

  get skillsFormArray() {
    return this.jobForm.get('coreSkills') as FormArray;
  }

  addSkill(skill: any = null) {
    const skillForm = this.fb.group({
      name: [skill?.name || '', Validators.required],
      mustHave: [skill?.mustHave || false],
      niceToHave: [skill?.niceToHave || false],
    });
    this.skillsFormArray.push(skillForm);
  }

  removeSkill(index: number) {
    this.skillsFormArray.removeAt(index);
  }

  validateSkills(): boolean {
    const skills = this.skillsFormArray.controls;
    const mustHaveSkills = skills.filter(
      (skill) => skill.get('mustHave')?.value
    ).length;

    // Ensure there are at least 3 "Must Have" skills
    return mustHaveSkills >= 3;
  }

  setupCityAutocomplete() {
    this.filteredCities = this.locationControl.valueChanges.pipe(
      startWith(''),
      map((value) => this._filter(value || ''))
    );
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.allCities.filter(
      (city) =>
        city.toLowerCase().includes(filterValue) &&
        !this.selectedLocations.includes(city)
    );
  }

  onLocationSelect(event: any): void {
    const selectedCity = event.option.value;
    if (!this.selectedLocations.includes(selectedCity)) {
      this.selectedLocations.push(selectedCity);
      this.updateLocationsFormControl();
      this.locationControl.setValue('');
      this.locationInput.nativeElement.value = '';
    }
  }

  removeLocation(location: string): void {
    const index = this.selectedLocations.indexOf(location);
    if (index >= 0) {
      this.selectedLocations.splice(index, 1);
      this.updateLocationsFormControl();
    }
  }

  updateLocationsFormControl(): void {
    // this.jobForm.get('locations')!.setValue(this.selectedLocations.join(', '));
    this.jobForm.get('location')!.setValue(this.selectedLocations.join(', ')); // Changed from 'locations' to 'location'
  }

  onInputFocus(): void {
    // Trigger filtering to show all available options
    this.locationControl.setValue(this.locationControl.value);
  }

  initCoreSkills() {
    return Array(5)
      .fill(null)
      .map(() =>
        this.fb.group({
          name: ['', Validators.required],
          mustHave: [false],
          niceToHave: [false],
        })
      );
  }
  setPostingAsClient(value: boolean) {
    this.postingAsClient = value;
    if (!value) {
      // Reset to default values when choosing default company
      this.recruiterService
        .findRecruiterDetailsByUserId()
        .then((recruiter) => {
          this.enforceCompanyProfileCompletion(recruiter);
          if (!recruiter) return;
          this.jobForm.patchValue({
            company: recruiter.company,
            company_url: recruiter.companyWebsite || '',
            company_logo: this.companyLogo,
          });
        })
        .catch((error) => {
          console.error('Error fetching recruiter details:', error);
          this.enforceCompanyProfileCompletion(null);
        });
    }
  }

  loadUserData() {
    this.userService.findLoggedUser().then((user) => {
      this.user = user;
      this.companyName = user.username;
      this.loadProfilePic(this.user._id);
      this.recruiterService
        .findRecruiterDetailsByUserId()
        .then((recruiter) => {
          if (recruiter) {
            this.company_url = recruiter.companyWebsite || '';
            this.jobForm.patchValue({
              company: this.companyName,
              company_url: recruiter.companyWebsite || '',
            });
          }
          this.enforceCompanyProfileCompletion(recruiter);
        })
        .catch((error) => {
          console.error('Error fetching recruiter details:', error);
          this.enforceCompanyProfileCompletion(null);
        });
    });
  }

  loadProfilePic(userId: string): void {
    this.userService.getProfilePic(userId).subscribe(
      (data: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.companyLogo = reader.result as string;
          this.jobForm.patchValue({ company_logo: this.companyLogo });
        };
        reader.readAsDataURL(data);
      },
      (error) => {
        console.error('Error fetching profile picture:', error);
      }
    );
  }

  private enforceCompanyProfileCompletion(recruiter: any | null): void {
    const requiredFields = [
      { key: 'company', label: 'Company name' },
      { key: 'companyWebsite', label: 'Company website' },
      { key: 'industry', label: 'Industry' },
      { key: 'location', label: 'Company location' },
      { key: 'aboutCompany', label: 'About company' },
      { key: 'companyMission', label: 'Company mission' },
      { key: 'numberOfEmployees', label: 'Team size' },
      { key: 'yearEstablished', label: 'Year established' },
      // { key: 'address', label: 'Address' },
      // { key: 'phone', label: 'Contact phone' },
      // { key: 'email', label: 'Contact email' },
    ];

    const missingFields = requiredFields
      .filter((field) => !this.isFieldFilled(recruiter?.[field.key]))
      .map((field) => field.label);

    if (missingFields.length > 0) {
      this.companyProfileMissingFields = missingFields;
      this.isCompanyProfileComplete = false;
      if (this.jobForm && this.jobForm.enabled) {
        this.jobForm.disable({ emitEvent: false });
      }
      if (!this.hasShownCompanyProfileWarning) {
        this.hasShownCompanyProfileWarning = true;
        setTimeout(() => {
          // ✅ AFTER
          this.toast.warning(
            `Please complete your company profile. Missing: ${missingFields.join(', ')}`
          );
          this.router.navigate(['/company/profile']);
        });
      }
    } else {
      this.companyProfileMissingFields = [];
      this.isCompanyProfileComplete = true;
      if (this.jobForm && this.jobForm.disabled) {
        this.jobForm.enable({ emitEvent: false });
      }
    }
  }

  private isFieldFilled(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== '';
  }

  get coreSkillsFormArray() {
    return this.jobForm.get('coreSkills') as FormArray;
  }

  // Custom Questions Logic
  get customQuestionsFormArray() {
    return this.jobForm.get('customQuestions') as FormArray;
  }

  addCustomQuestion(question: any = null) {
    const optionsArray = question?.options && Array.isArray(question.options)
      ? this.fb.array(question.options.map((opt: string) => this.fb.control(opt)))
      : this.fb.array([]);
    
    const questionForm = this.fb.group({
      question: [question?.question || '', Validators.required],
      answerType: [question?.answerType || 'Short Answer', Validators.required],
      options: optionsArray, // Only for Multiple Choice
      required: [question?.required || false],
    });
    this.customQuestionsFormArray.push(questionForm);
  }

  removeCustomQuestion(index: number) {
    this.customQuestionsFormArray.removeAt(index);
  }

  addOption(questionIndex: number) {
    const options = this.customQuestionsFormArray
      .at(questionIndex)
      .get('options') as FormArray;
    options.push(this.fb.control('', Validators.required));
  }

  removeOption(questionIndex: number, optionIndex: number) {
    const options = this.customQuestionsFormArray
      .at(questionIndex)
      .get('options') as FormArray;
    options.removeAt(optionIndex);
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  nextStep() {
    const controlsToCheck = this.getCurrentStepControls();
    let valid = true;
    if (controlsToCheck.length > 0) {
      controlsToCheck.forEach((ctrl) => {
        ctrl.markAsTouched();
        if (ctrl.invalid) valid = false;
      });
    }
    if (valid) {
      if (this.currentStep < 5) {
        this.currentStep++;
      }
    } else {
      // ✅ AFTER
      this.toast.warning('Please fill out all required fields for this step before proceeding.');
    }
  }

  /**
   * Returns an array of AbstractControl for the current step
   */
  getCurrentStepControls(): any[] {
    switch (this.currentStep) {
      case 1:
        return [
          this.jobForm.get('title'),
          this.jobForm.get('locationType'),
          this.jobForm.get('location'),
          this.jobForm.get('type'),
          this.jobForm.get('minQualification'),
          this.jobForm.get('minExp'),
          this.jobForm.get('maxExp'),
        ];
      case 2:
        return [this.jobForm.get('description')];
      case 3:
        return this.skillsFormArray.controls;
      case 4:
        return this.customQuestionsFormArray.controls;
      case 5:
        return []; // Preview step - no validation needed
      default:
        return [];
    }
  }

  loadJobPosting() {
    if (!this.jobId) return;
    
    this.jobPostService
      .getJobPostingById(this.jobId)
      .subscribe((jobPosting: any) => {
        // Patch form values
        this.jobForm.patchValue({
          title: jobPosting.title || '',
          locationType: jobPosting.locationType || '',
          type: jobPosting.type || '',
          description: jobPosting.description || '',
          company: jobPosting.company || '',
          company_logo: jobPosting.company_logo || '',
          company_url: jobPosting.company_url || '',
          minQualification: jobPosting.minQualification || '',
          minSalary: jobPosting.minSalary || null,
          maxSalary: jobPosting.maxSalary || null,
          minExp: jobPosting.minExp || null,
          maxExp: jobPosting.maxExp || null,
          status: jobPosting.status || 'active',
        });

        // Handle locations
        if (jobPosting.location) {
          this.selectedLocations = Array.isArray(jobPosting.location)
            ? jobPosting.location
            : jobPosting.location.split(',').map((loc: string) => loc.trim());
          this.updateLocationsFormControl();
        }

        // Handle skills
        if (jobPosting.coreSkills && Array.isArray(jobPosting.coreSkills)) {
          // Clear existing skills
          while (this.skillsFormArray.length !== 0) {
            this.skillsFormArray.removeAt(0);
          }
          // Add skills from job posting
          jobPosting.coreSkills.forEach((skill: any) => {
            this.addSkill(skill);
          });
        }

        // Handle custom questions
        if (jobPosting.customQuestions && Array.isArray(jobPosting.customQuestions)) {
          // Clear existing questions
          while (this.customQuestionsFormArray.length !== 0) {
            this.customQuestionsFormArray.removeAt(0);
          }
          // Add questions from job posting
          jobPosting.customQuestions.forEach((question: any) => {
            this.addCustomQuestion(question);
          });
        }

        // Check if posting as client
        this.postingAsClient = jobPosting.company && jobPosting.company !== this.companyName;
      });
  }

  onSubmit() {
    if (!this.isCompanyProfileComplete) {
      // ✅ AFTER
      this.toast.warning('Please complete your company profile before posting or updating a job.');
      this.router.navigate(['/company/profile']);
      return;
    }
    if (this.jobForm.valid && this.validateSkills()) {
      const jobData: JobPostingModelClient = {
        ...this.jobForm.value,
        datePosted: new Date(),
        created_at: new Date().toISOString(),
        date: new Date().toDateString(),
        // Ensure the description is sanitized if necessary
        description: this.sanitizeHtml(this.jobForm.get('description')?.value),
        // Add custom questions to jobData
        customQuestions: this.jobForm.get('customQuestions')?.value,
      };

      if (this.isEditMode && this.jobId) {
        // Update existing job
        this.jobPostService
          .updateJobPosting(this.jobId, jobData)
          // ✅ AFTER
          .then(() => {
            this.toast.success('Job updated successfully!');
            setTimeout(() => this.router.navigate(['/company/job-postings']), 1500);
          })
          .catch((error) => {
            console.error('Error updating job:', error);
            // ✅ AFTER
            this.toast.error('An error occurred while updating the job. Please try again.');
          });
      } else {
        // Create new job
        this.jobPostService
          .createJobPosting(jobData)
          // ✅ AFTER
          .then(() => {
            this.toast.success('Job posted successfully!');
            setTimeout(() => this.router.navigate(['/company/job-postings']), 1500);
          })
          .catch((error) => {
            console.error('Error posting job:', error);
            // ✅ AFTER
            this.toast.error('An error occurred while posting the job. Please try again.');
          });
      }
    } else {
      this.jobForm.markAllAsTouched();
      if (!this.validateSkills()) {
        // ✅ AFTER
        this.toast.warning('Please ensure at least 3 skills are marked as Must Have.');
      } else {
        // ✅ AFTER
        this.toast.error('Please fill out all required fields correctly.');
      }
    }
  }

  // Add this method to sanitize HTML if needed
  // ✅ AFTER
  sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h3'],
      ALLOWED_ATTR: []
    });
  }

  // AI-related methods
  toggleAIGenerator() {
    this.showAIGenerator = !this.showAIGenerator;
    this.toggleBodyScroll();
  }

  closeAIGenerator() {
    this.showAIGenerator = false;
    this.toggleBodyScroll();
  }

  private toggleBodyScroll() {
    if (this.showAIGenerator) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  private setupKeyboardListeners() {
    document.addEventListener('keydown', this.keydownHandler);
  }

  onJobGenerated(aiResponse: AIJobGenerationResponse) {
    // Build HTML-formatted description
    let descriptionHtml = '';
    if (aiResponse.description) {
      descriptionHtml += `<p>${aiResponse.description.replace(
        /\n/g,
        '<br>'
      )}</p>`;
    }

    // Add responsibilities as HTML list
    if (aiResponse.responsibilities && aiResponse.responsibilities.length > 0) {
      descriptionHtml += '<h3>Key Responsibilities:</h3><ul>';
      aiResponse.responsibilities.forEach((resp: string) => {
        descriptionHtml += `<li>${resp}</li>`;
      });
      descriptionHtml += '</ul>';
    }

    // Add requirements as HTML list
    if (aiResponse.requirements && aiResponse.requirements.length > 0) {
      descriptionHtml += '<h3>Requirements:</h3><ul>';
      aiResponse.requirements.forEach((req: string) => {
        descriptionHtml += `<li>${req}</li>`;
      });
      descriptionHtml += '</ul>';
    }

    // Add benefits as HTML list
    if (aiResponse.benefits && aiResponse.benefits.length > 0) {
      descriptionHtml += '<h3>Benefits:</h3><ul>';
      aiResponse.benefits.forEach((benefit: string) => {
        descriptionHtml += `<li>${benefit}</li>`;
      });
      descriptionHtml += '</ul>';
    }

    // Populate the form with AI-generated content
    this.jobForm.patchValue({
      title: aiResponse.title,
      locationType: aiResponse.locationType,
      location: aiResponse.location,
      type: aiResponse.jobType,
      minExp: aiResponse.minExp,
      maxExp: aiResponse.maxExp,
      minSalary: aiResponse.minSalary,
      maxSalary: aiResponse.maxSalary,
      description: descriptionHtml,
      minQualification: aiResponse.minQualification,
    });

    // Populate skills
    if (aiResponse.skills && aiResponse.skills.length > 0) {
      // Clear existing skills
      while (this.skillsFormArray.length !== 0) {
        this.skillsFormArray.removeAt(0);
      }
      // Add AI-generated skills
      aiResponse.skills.forEach((skill: any) => {
        const skillForm = this.fb.group({
          name: [skill.name, Validators.required],
          mustHave: [skill.mustHave],
          niceToHave: [skill.niceToHave],
        });
        this.skillsFormArray.push(skillForm);
      });
    }

    // Populate custom questions
    if (aiResponse.customQuestions && aiResponse.customQuestions.length > 0) {
      // Clear existing custom questions
      while (this.customQuestionsFormArray.length !== 0) {
        this.customQuestionsFormArray.removeAt(0);
      }
      // Add AI-generated custom questions
      aiResponse.customQuestions.forEach((question: any) => {
        const questionForm = this.fb.group({
          question: [question.question, Validators.required],
          answerType: [
            question.answerType || 'Short Answer',
            Validators.required,
          ],
          options: this.fb.array(question.options || []),
          required: [question.required || false],
        });
        this.customQuestionsFormArray.push(questionForm);
      });
    }

    this.closeAIGenerator();
    // Move to description step
  }

  onSkillsGenerated(skills: string[]) {
    // Clear existing skills
    while (this.skillsFormArray.length !== 0) {
      this.skillsFormArray.removeAt(0);
    }

    // Add generated skills (alternating between must-have and nice-to-have)
    skills.forEach((skill, index) => {
      const skillForm = this.fb.group({
        name: [skill, Validators.required],
        // ✅ AFTER
        mustHave: [index < 3],
        niceToHave: [index >= 3],
      });
      this.skillsFormArray.push(skillForm);
    });

    this.currentStep = 3; // Move to skills step
  }

  onCustomQuestionsGenerated(questions: any[]) {
    // Clear existing custom questions
    while (this.customQuestionsFormArray.length !== 0) {
      this.customQuestionsFormArray.removeAt(0);
    }

    // Add generated custom questions
    questions.forEach((question) => {
      const questionForm = this.fb.group({
        question: [question.question, Validators.required],
        answerType: [
          question.answerType || 'Short Answer',
          Validators.required,
        ],
        options: this.fb.array(question.options || []),
        required: [question.required || false],
      });
      this.customQuestionsFormArray.push(questionForm);
    });

    this.currentStep = 4; // Move to custom questions step
  }

  enhanceDescription() {
    const currentDescription = this.jobForm.get('description')?.value;
    const jobTitle = this.jobForm.get('title')?.value;
    const company = this.jobForm.get('company')?.value;

    if (currentDescription && jobTitle && company) {
      this.isEnhancingDescription = true;
      this.aiService
        .enhanceJobDescription({
          currentDescription,
          jobTitle,
          company,
          enhancementType: 'improve',
        })
        .subscribe({
          next: (response) => {
            this.jobForm.patchValue({
              description: response.description,
            });
            this.isEnhancingDescription = false;
          },
          error: (error) => {
            console.error('Error enhancing description:', error);
            this.isEnhancingDescription = false;
            // ✅ AFTER
            this.toast.error('Failed to enhance description. Please try again.');
          },
        });
    }
  }

  generateJobTitles() {
    const company = this.jobForm.get('company')?.value;
    const context = this.jobForm.get('description')?.value || '';

    if (company) {
      this.aiService.generateJobTitles(company, context).subscribe({
        next: (response) => {
          // Show job title suggestions in a modal or dropdown
          const suggestions = response.titles.join('\n');
          const selectedTitle = prompt(
            `Suggested job titles:\n${suggestions}\n\nEnter your preferred title or modify one of the suggestions:`
          );
          if (selectedTitle) {
            this.jobForm.patchValue({
              title: selectedTitle,
            });
          }
        },
        error: (error) => {
          console.error('Error generating job titles:', error);
          // ✅ AFTER
          this.toast.error('Failed to generate job titles. Please try again.');
        },
      });
    }
  }

  generateSkills() {
    const jobTitle = this.jobForm.get('title')?.value;
    const description = this.jobForm.get('description')?.value;

    if (jobTitle && description) {
      this.aiService.generateSkills(jobTitle, description).subscribe({
        next: (response) => {
          // Clear existing skills
          while (this.skillsFormArray.length !== 0) {
            this.skillsFormArray.removeAt(0);
          }

          // Add generated skills (alternating between must-have and nice-to-have)
          response.skills.forEach((skill: string, index: number) => {
            const skillForm = this.fb.group({
              name: [skill, Validators.required],
              // ✅ AFTER
              mustHave: [index < 3],
              niceToHave: [index >= 3],
            });
            this.skillsFormArray.push(skillForm);
          });

          // Move to skills step
          this.currentStep = 3;
        },
        error: (error) => {
          console.error('Error generating skills:', error);
          // ✅ AFTER
          this.toast.error('Failed to generate skills. Please try again.');
        },
      });
    } else {
      alert(
        'Please provide a job title and description before generating skills.'
      );
    }
  }

  analyzeJobPosting() {
    const jobData = this.jobForm.value;

    this.aiService.analyzeJobPosting(jobData).subscribe({
      next: (analysis) => {
        let message = `Job Posting Analysis:\n\n`;
        message += `Completeness: ${analysis.completeness}%\n\n`;

        if (analysis.suggestions.length > 0) {
          message += `Suggestions:\n`;
          analysis.suggestions.forEach((suggestion) => {
            message += `• ${suggestion}\n`;
          });
        }

        if (analysis.missingFields.length > 0) {
          message += `\nMissing Fields:\n`;
          analysis.missingFields.forEach((field) => {
            message += `• ${field}\n`;
          });
        }

        alert(message);
      },
      error: (error) => {
        console.error('Error analyzing job posting:', error);
        alert('Failed to analyze job posting. Please try again.');
      },
    });
  }

  getStepProgress(): number {
    return (this.currentStep / 5) * 100;
  }

  // ✅ AFTER
  ngOnDestroy() {
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', this.keydownHandler);
  }
}
