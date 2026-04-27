import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { EducationService } from '../../services/education.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';

interface Education {
  _id?: string;
  institute: string;
  location: string;
  startDate: { month: string; year: string };
  endDate: { month: string; year: string };
  ongoingStatus: boolean | string; // API returns "Ongoing" or "Completed" string
  description: string;
  fieldOfStudy: string;
  degree: string;
  grade: string;
  url: string;
  notes: string;
}

@Component({
  selector: 'app-education-list',
  templateUrl: './education-list.component.html',
  styleUrls: ['./education-list.component.css']
})
export class EducationListComponent implements OnInit {
  educationForm!: FormGroup;
  isAddMode = false;
  isEditMode = false;
  months: string[] = [];
  years: string[] = [];
  education: Education[] = [];
  currentStep = 1;
  updateId = '';
  user: any;
  isLoading=false; 
  pendingDeleteId: string | null = null;
  readonly editorConfig = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['blockquote', 'code-block'],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['clean']
    ]
  };
  @Output() dataChanged = new EventEmitter<void>();
  
  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private educationService: EducationService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.initializeMonths();
    this.initializeYears();
    this.loadUserEducation();
  }

  private initializeForm(): void {
    this.educationForm = this.fb.group({
      institute: ['', [Validators.required, Validators.minLength(2)]],
      location: ['', Validators.required],
      startMonth: ['Month', [Validators.required, Validators.pattern('^(?!Month$).*$')]],
      startYear: ['Year', [Validators.required, Validators.pattern('^(?!Year$).*$')]],
      endMonth: ['Month'],
      endYear: ['Year'],
      ongoingStatus: [false],
      description: [''],
      degree: ['', Validators.required],
      fieldOfStudy: ['', Validators.required],
      grade: [''],
      url: ['', Validators.pattern('https?://.+')],
      notes: ['']
    });

    // Update end date validation based on ongoing status
    this.educationForm.get('ongoingStatus')?.valueChanges.subscribe(isOngoing => {
      const endMonth = this.educationForm.get('endMonth');
      const endYear = this.educationForm.get('endYear');
      
      if (isOngoing) {
        endMonth?.clearValidators();
        endYear?.clearValidators();
      } else {
        endMonth?.setValidators([Validators.required, Validators.pattern('^(?!Month$).*$')]);
        endYear?.setValidators([Validators.required, Validators.pattern('^(?!Year$).*$')]);
      }
      
      endMonth?.updateValueAndValidity();
      endYear?.updateValueAndValidity();
    });
  }

  private async loadUserEducation(): Promise<void> {
    this.user = await this.userService.findLoggedUser();
    if (this.user) {
      this.education = await this.educationService.findEducationByUserId();
      this.dataChanged.emit();
    }
  }

  add(): void {
    this.isAddMode = true;
    this.isEditMode = false;
    this.educationForm.reset();
    this.currentStep = 1;
  }

  async create(): Promise<void> {
    if (this.educationForm.invalid) {
      this.markFormGroupTouched(this.educationForm);
      return;
    }

    const formValue = this.educationForm.value;
    const newEducation = {
      ...formValue,
      startDate: { month: formValue.startMonth, year: formValue.startYear },
      endDate: { month: formValue.endMonth, year: formValue.endYear }
    };

    await this.educationService.createEducation(newEducation);
    this.education = await this.educationService.findEducationByUserId();
    this.dataChanged.emit();
    this.isAddMode = false;
    this.educationForm.reset();
  }

  edit(education: Education, id: string): void {
    this.isEditMode = true;
    this.updateId = id;
    this.currentStep = 1;

    // Ensure ongoingStatus is boolean - check if it's "Ongoing" string or true boolean
    const ongoingStatus = education.ongoingStatus === 'Ongoing' || education.ongoingStatus === true;

    this.educationForm.patchValue({
      institute: education.institute,
      location: education.location,
      startMonth: education.startDate.month,
      startYear: education.startDate.year,
      endMonth: education.endDate.month,
      endYear: education.endDate.year,
      ongoingStatus: ongoingStatus,
      description: education.description,
      degree: education.degree,
      fieldOfStudy: education.fieldOfStudy,
      grade: education.grade,
      url: education.url,
      notes: education.notes
    });
  }

  async update(): Promise<void> {
    if (this.educationForm.invalid) {
      this.markFormGroupTouched(this.educationForm);
      return;
    }

    const formValue = this.educationForm.value;
    const updatedEducation = {
      ...formValue,
      startDate: { month: formValue.startMonth, year: formValue.startYear },
      endDate: { month: formValue.endMonth, year: formValue.endYear }
    };

    await this.educationService.updateEducation(this.updateId, updatedEducation);
    this.education = await this.educationService.findEducationByUserId();
    this.dataChanged.emit();
    this.isEditMode = false;
    this.educationForm.reset();
  }

  async delete(id: string): Promise<void> {
  if (this.pendingDeleteId === id) {
    this.pendingDeleteId = null;
    try {
      await this.educationService.deleteEducation(id);
      this.education = await this.educationService.findEducationByUserId();
      this.dataChanged.emit();
      this.toastr.success('Education record deleted');
    } catch (error) {
      console.error('Error deleting education:', error);
      this.toastr.error('Failed to delete. Please try again.');
    }
  } else {
    this.pendingDeleteId = id;
    this.toastr.warning('Click delete again to confirm', 'Are you sure?');
    setTimeout(() => {
      if (this.pendingDeleteId === id) this.pendingDeleteId = null;
    }, 4000);
  }
}
  nextStep(): void {
    if (this.isStepValid(this.currentStep)) {
      this.currentStep++;
    } else {
      this.markFormGroupTouched(this.educationForm);
    }
  }

  previousStep(): void {
    this.currentStep--;
  }

  cancel(): void {
    this.isAddMode = false;
    this.isEditMode = false;
    this.educationForm.reset();
    this.currentStep = 1;
  }

  private isStepValid(step: number): boolean {
    const controls = this.educationForm.controls;
    switch (step) {
      case 1:
        return controls['institute'].valid && 
               controls['location'].valid && 
               controls['startMonth'].valid && 
               controls['startYear'].valid;
      case 2:
        return controls['degree'].valid && 
               controls['fieldOfStudy'].valid;
      default:
        return true;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private initializeMonths(): void {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    this.months = ['Month', ...monthNames];
  }

  private initializeYears(): void {
    const currentYear = new Date().getFullYear();
    const startYear = 1950;
    const endYear = currentYear + 10;
    this.years = ['Year', ...Array.from(
      { length: endYear - startYear + 1 }, 
      (_, i) => String(startYear + i)
    )];
  }

  // Helper methods for template
  getFieldError(fieldName: string): string {
    const control = this.educationForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['minlength']) return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['pattern']) {
        if (fieldName === 'url') return 'Please enter a valid URL';
        return `Please select a valid ${fieldName}`;
      }
    }
    return '';
  }


  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  isEducationOngoing(education: Education): boolean {
    // Check if education is truly ongoing
    // It's ongoing only if ongoingStatus is 'Ongoing' string AND there's no end date year
    return education.ongoingStatus === 'Ongoing' && !education.endDate?.year;
  }
}