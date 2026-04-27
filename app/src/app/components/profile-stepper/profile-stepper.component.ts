import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';

export interface ProfileStep {
  id: string;
  label: string;
  icon: string;
  completed: boolean;
  disabled: boolean;
}

@Component({
  selector: 'app-profile-stepper',
  templateUrl: './profile-stepper.component.html',
  styleUrls: ['./profile-stepper.component.css']
})
export class ProfileStepperComponent implements OnInit, OnChanges {
  @Input() currentStep: number = 0;
  @Input() steps: ProfileStep[] = [];
  @Output() stepChange = new EventEmitter<number>();

  stepsList: ProfileStep[] = [
    { id: 'personal', label: 'Personal Info', icon: 'fa-user', completed: false, disabled: false },
    { id: 'experience', label: 'Experience', icon: 'fa-briefcase', completed: false, disabled: false },
    { id: 'education', label: 'Education', icon: 'fa-graduation-cap', completed: false, disabled: false },
    { id: 'skills', label: 'Skills & Certifications', icon: 'fa-certificate', completed: false, disabled: false },
    { id: 'attachments', label: 'Portfolio/Attachments', icon: 'fa-paperclip', completed: false, disabled: false },
    { id: 'preview', label: 'Preview & Publish', icon: 'fa-eye', completed: false, disabled: false }
  ];

  ngOnInit(): void {
    if (this.steps && this.steps.length > 0) {
      this.stepsList = this.steps;
    }
    this.updateStepStates();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['steps'] || changes['currentStep']) {
      this.updateStepStates();
    }
  }

  private updateStepStates(): void {
    // Update completion status based on current step
    this.stepsList.forEach((step, index) => {
      step.completed = index < this.currentStep;
      // Allow navigation to current step and completed steps
      step.disabled = index > this.currentStep && !step.completed;
    });
  }

  goToStep(index: number): void {
    if (index >= 0 && index < this.stepsList.length && !this.stepsList[index].disabled) {
      this.currentStep = index;
      this.stepChange.emit(index);
      this.updateStepStates();
    }
  }

  nextStep(): void {
    if (this.currentStep < this.stepsList.length - 1) {
      this.goToStep(this.currentStep + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  get progressPercentage(): number {
    return Math.round(((this.currentStep + 1) / this.stepsList.length) * 100);
  }

  getStepStatus(index: number): 'current' | 'completed' | 'upcoming' {
    if (index === this.currentStep) return 'current';
    if (index < this.currentStep) return 'completed';
    return 'upcoming';
  }

  handleKeyPress(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.goToStep(index);
    }
  }
}

