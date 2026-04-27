import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { PlanService } from '../../services/plan.service';

@Component({
  selector: 'app-custom-plan-modal',
  templateUrl: './custom-plan-modal.component.html',
  styleUrls: ['./custom-plan-modal.component.css']
})
export class CustomPlanModalComponent implements OnInit {
  customPlanForm!: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  teamSizeOptions = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '500+ employees'
  ];

  interestAreas = [
    { value: 'volume_hiring', label: 'Volume Hiring', checked: false },
    { value: 'ai_screening', label: 'AI-Powered Screening', checked: false },
    { value: 'integrations', label: 'Custom Integrations', checked: false },
    { value: 'white_label', label: 'White-Label Solution', checked: false },
    { value: 'dedicated_support', label: 'Dedicated Support', checked: false },
    { value: 'training', label: 'Team Training', checked: false }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CustomPlanModalComponent>,
    private planService: PlanService
  ) {}

  ngOnInit(): void {
    this.customPlanForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      contactName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      teamSize: ['', Validators.required],
      requirements: ['', [Validators.required, Validators.minLength(20)]],
      interests: [[]]
    });
  }

  toggleInterest(interest: any): void {
    interest.checked = !interest.checked;
    this.updateInterestsFormControl();
  }

  updateInterestsFormControl(): void {
    const selected = this.interestAreas
      .filter(i => i.checked)
      .map(i => i.value);
    this.customPlanForm.patchValue({ interests: selected });
  }

  onSubmit(): void {
    if (this.customPlanForm.invalid) {
      Object.keys(this.customPlanForm.controls).forEach(key => {
        this.customPlanForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    this.planService.submitCustomPlanRequest(this.customPlanForm.value)
      .subscribe({
        next: () => {
          this.submitSuccess = true;
          setTimeout(() => {
            this.dialogRef.close({ success: true });
          }, 2000);
        },
        error: (err: Error) => {
          this.submitError = 'Failed to submit request. Please try again.';
          this.isSubmitting = false;
          console.error('Custom plan request error:', err);
        }
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.customPlanForm.get(fieldName);
    if (!control?.touched || !control?.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['email']) return 'Please enter a valid email';
    if (control.errors['pattern']) return 'Please enter a valid 10-digit phone number';
    if (control.errors['minLength']) return `Minimum length is ${control.errors['minLength'].requiredLength}`;

    return '';
  }
}