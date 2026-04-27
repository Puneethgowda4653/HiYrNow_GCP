import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-assignment-modal',
  animations: [
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
  template: `
    <div
      class="w-full  p-4 bg-gradient-to-br from-white to-blue-50 rounded-xl max-h-[80vh] overflow-y-auto"
      @fadeSlideIn
    >
      <!-- Header -->
      <div class="mb-4">
        <h2
          class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
        >
          📚 New Assignment
        </h2>
        <p class="text-gray-500 text-xs mt-1">
          Fill in the details below to create your assignment
        </p>
      </div>

      <form
        [formGroup]="assignmentForm"
        (ngSubmit)="onSubmit()"
        class="space-y-2"
      >
        <!-- Title Input -->
        <div class="group">
          <label
            class="block text-xs font-medium text-gray-700 mb-1 transition-colors group-focus-within:text-blue-600"
          >
            Assignment Title
          </label>
          <div class="relative">
            <input
              type="text"
              formControlName="title"
              class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder:text-gray-400 text-xs"
              placeholder="e.g., Advanced React Patterns"
              [class.border-red-300]="
                assignmentForm.get('title')?.invalid &&
                assignmentForm.get('title')?.touched
              "
            />
            <div
              *ngIf="
                assignmentForm.get('title')?.invalid &&
                assignmentForm.get('title')?.touched
              "
              class="text-red-500 text-xs mt-0.5 ml-1 animate-fade-in"
            >
              Title is required
            </div>
          </div>
        </div>

        <!-- Description Input -->
        <div class="group">
          <label
            class="block text-xs font-medium text-gray-700 mb-1 transition-colors group-focus-within:text-blue-600"
          >
            Description
          </label>
          <textarea
            formControlName="description"
            rows="3"
            class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   placeholder:text-gray-400 resize-none text-xs"
            placeholder="Describe what students need to do..."
            [class.border-red-300]="
              assignmentForm.get('description')?.invalid &&
              assignmentForm.get('description')?.touched
            "
          >
          </textarea>
          <div
            *ngIf="
              assignmentForm.get('description')?.invalid &&
              assignmentForm.get('description')?.touched
            "
            class="text-red-500 text-xs mt-0.5 ml-1 animate-fade-in"
          >
            Description is required
          </div>
        </div>

        <!-- PDF Link Input -->
        <div class="group">
          <label
            class="block text-xs font-medium text-gray-700 mb-1 transition-colors group-focus-within:text-blue-600"
          >
            Assignment PDF Link
          </label>
          <div class="relative">
            <span
              class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
            >
              🔗
            </span>
            <input
              type="url"
              formControlName="pdfLink"
              class="w-full pl-7 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder:text-gray-400 text-xs"
              placeholder="https://example.com/assignment.pdf"
              [class.border-red-300]="
                assignmentForm.get('pdfLink')?.invalid &&
                assignmentForm.get('pdfLink')?.touched
              "
            />
          </div>
          <div
            *ngIf="
              assignmentForm.get('pdfLink')?.invalid &&
              assignmentForm.get('pdfLink')?.touched
            "
            class="text-red-500 text-xs mt-0.5 ml-1 animate-fade-in"
          >
            Please enter a valid URL
          </div>
        </div>

        <!-- Deadline Input -->
        <div class="group">
          <label
            class="block text-xs font-medium text-gray-700 mb-1 transition-colors group-focus-within:text-blue-600"
          >
            Deadline (in days)
          </label>
          <div class="relative">
            <span
              class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
            >
              ⏰
            </span>
            <input
              type="number"
              formControlName="deadlineDays"
              class="w-full pl-7 pr-2 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder:text-gray-400 text-xs"
              min="1"
              placeholder="Enter number of days"
              [class.border-red-300]="
                assignmentForm.get('deadlineDays')?.invalid &&
                assignmentForm.get('deadlineDays')?.touched
              "
            />
          </div>
          <div
            *ngIf="
              assignmentForm.get('deadlineDays')?.invalid &&
              assignmentForm.get('deadlineDays')?.touched
            "
            class="text-red-500 text-xs mt-0.5 ml-1 animate-fade-in"
          >
            Please enter a valid number of days (minimum 1)
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            (click)="onCancel()"
            class="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 
                   transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="!assignmentForm.valid"
            class="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg
                   transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-1"
          >
            <span>Send Assignment</span>
            <span *ngIf="assignmentForm.valid">✨</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .animate-fade-in {
        animation: fadeIn 0.2s ease-out;
      }
    `,
  ],
})
export class AssignmentModalComponent {
  assignmentForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AssignmentModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.assignmentForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      pdfLink: ['', [Validators.required, Validators.pattern('https?://.+')]],
      deadlineDays: ['', [Validators.required, Validators.min(1)]],
    });
  }

  onSubmit(): void {
    if (this.assignmentForm.valid) {
      this.dialogRef.close(this.assignmentForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
