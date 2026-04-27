import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  FormControl,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { JobPostingService } from '../../services/job-posting.service';
import { UserService } from '../../services/user.service';
import { RecruiterDetailService } from '../../services/recruiter-detail.service';
import { JobPostingModelClient } from '../../models/job-posting.model.client';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-edit-job-posting',
  templateUrl: './edit-job-posting.component.html',
  styleUrls: ['./edit-job-posting.component.css'],
})
export class EditJobPostingComponent implements OnInit {
  jobForm!: FormGroup;
  @ViewChild('locationInput') locationInput!: ElementRef<HTMLInputElement>;
  currentStep = 1;
  jobId!: string;
  user: any;
  companyLogo: string = '/assets/default-logo.png';
  postingAsClient: boolean = false;
  companyName: string = '';

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
    private jobPostingService: JobPostingService,
    private userService: UserService,
    private recruiterService: RecruiterDetailService
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadUserData();
    this.setupCityAutocomplete();
    this.jobId = this.route.snapshot.paramMap.get('id')!;
    this.loadJobPosting();
  }

  initForm() {
    this.jobForm = this.fb.group({
      title: ['', Validators.required],
      location: ['', Validators.required],
      type: ['', Validators.required],
      description: ['', Validators.required],
      company: [''],
      company_logo: [''],
      minQualification: ['', Validators.required],
      company_url: [''],
      minSalary: ['', [Validators.required, Validators.min(0)]],
      maxSalary: ['', [Validators.required, Validators.min(0)]],
      minExp: ['', [Validators.required, Validators.min(0)]],
      maxExp: ['', [Validators.required, Validators.min(0)]],
      status: ['open'],
      coreSkills: this.fb.array([]),
    });
  }

  loadJobPosting() {
    this.jobPostingService
      .getJobPostingById(this.jobId)
      .subscribe((jobPosting) => {
        this.jobForm.patchValue(jobPosting);
        this.selectedLocations = jobPosting.location.split(', ');
        this.updateLocationsFormControl();

        // Clear existing core skills
        // while (this.skillsFormArray.length !== 0) {
        //   this.skillsFormArray.removeAt(0);
        // }

        // Add core skills from the job posting
        if (jobPosting.coreSkills && Array.isArray(jobPosting.coreSkills)) {
          jobPosting.coreSkills.forEach((skill: any) => {
            this.addSkill(skill);
          });
        }

        this.postingAsClient = jobPosting.company !== this.companyName;
      });
  }

  get skillsFormArray() {
    return this.jobForm.get('coreSkills') as FormArray;
  }

  addSkill(skill: any = { name: '', mustHave: false, niceToHave: false }) {
    const skillForm = this.fb.group({
      name: [skill.name, Validators.required],
      mustHave: [skill.mustHave],
      niceToHave: [skill.niceToHave],
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
    this.jobForm.get('location')!.setValue(this.selectedLocations.join(', '));
  }

  onInputFocus(): void {
    this.locationControl.setValue(this.locationControl.value);
  }

  setPostingAsClient(value: boolean) {
    this.postingAsClient = value;
    if (!value) {
      this.recruiterService.findRecruiterDetailsByUserId().then((recruiter) => {
        this.jobForm.patchValue({
          company: recruiter.company,
          company_url: recruiter.companyWebsite || '',
          company_logo: this.companyLogo,
        });
      });
    }
  }

  loadUserData() {
    this.userService.findLoggedUser().then((user) => {
      this.user = user;
      this.loadProfilePic(this.user._id);
      this.recruiterService.findRecruiterDetailsByUserId().then((recruiter) => {
        this.companyName = recruiter.company;
        this.jobForm.patchValue({
          company: recruiter.company,
          company_url: recruiter.companyWebsite || '',
        });
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

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  nextStep() {
    if (this.jobForm.valid || this.currentStep < 3) {
      if (this.currentStep < 3) {
        this.currentStep++;
      }
    } else {
      this.jobForm.markAllAsTouched();
      alert('Please fill out all required fields correctly before proceeding.');
    }
  }

  onSubmit() {
    if (this.jobForm.valid && this.validateSkills()) {
      const jobData: JobPostingModelClient = {
        ...this.jobForm.value,
        description: this.sanitizeHtml(this.jobForm.get('description')?.value),
      };

      this.jobPostingService
        .updateJobPosting(this.jobId, jobData)
        .then(() => {
          alert('Job updated successfully!');
          this.router.navigate(['/company/dashboard']);
        })
        .catch((error) => {
          console.error('Error updating job:', error);
          alert('An error occurred while updating the job. Please try again.');
        });
    } else {
      this.jobForm.markAllAsTouched();
      if (!this.validateSkills()) {
        alert('Please ensure at least 3 of skills are marked as "Must Have".');
      } else {
        alert('Please fill out all required fields correctly.');
      }
    }
  }

  sanitizeHtml(html: string): string {
    // Implement HTML sanitization logic here
    return html;
  }
}
