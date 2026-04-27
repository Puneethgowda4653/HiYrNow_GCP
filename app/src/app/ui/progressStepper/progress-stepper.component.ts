import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-stepper',
  standalone: false,
  templateUrl: './progress-stepper.component.html',
  styleUrls: ['./progress-stepper.component.css']
})
export class ProgressStepperComponent {
  @Input() currentStep: number = 1;
  @Input() totalSteps: number = 4;
  @Input() steps: string[] = [];

  Math = Math; // Expose Math to template

  get progressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  getStepStatus(step: number): 'completed' | 'current' | 'upcoming' {
    if (step < this.currentStep) return 'completed';
    if (step === this.currentStep) return 'current';
    return 'upcoming';
  }
}

