import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-ui-form-field',
  template: `
    <div class="space-y-2">
      <label 
        *ngIf="label" 
        [for]="id"
        class="block text-sm font-semibold text-gray-700"
      >
        {{ label }}
        <span *ngIf="required" class="text-red-500 ml-1">*</span>
      </label>
      
      <div class="relative">
        <!-- Icon prefix -->
        <div 
          *ngIf="icon" 
          class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
        >
          <i [class]="'fas fa-' + icon + ' text-gray-400 text-sm'"></i>
        </div>

        <!-- Input field -->
        <input
          *ngIf="type !== 'textarea' && type !== 'select'"
          [id]="id"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [value]="value"
          (input)="onInput($event)"
          (blur)="onTouched()"
          [ngClass]="inputClasses"
        />

        <!-- Textarea -->
        <textarea
          *ngIf="type === 'textarea'"
          [id]="id"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [rows]="rows"
          [value]="value"
          (input)="onInput($event)"
          (blur)="onTouched()"
          [ngClass]="inputClasses"
        ></textarea>

        <!-- Select dropdown -->
        <select
          *ngIf="type === 'select'"
          [id]="id"
          [disabled]="disabled"
          [value]="value"
          (change)="onInput($event)"
          (blur)="onTouched()"
          [ngClass]="inputClasses"
        >
          <option value="" disabled>{{ placeholder || 'Select an option' }}</option>
          <option 
            *ngFor="let option of options" 
            [value]="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Helper text or error -->
      <p 
        *ngIf="helperText || error" 
        class="text-xs"
        [ngClass]="error ? 'text-red-600' : 'text-gray-500'"
      >
        <i *ngIf="error" class="fas fa-exclamation-circle mr-1"></i>
        {{ error || helperText }}
      </p>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiFormFieldComponent),
      multi: true
    }
  ]
})
export class UiFormFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' = 'text';
  @Input() icon = '';
  @Input() helperText = '';
  @Input() error = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() rows = 4;
  @Input() options: Array<{ label: string; value: string }> = [];
  @Input() id = `form-field-${Math.random().toString(36).substr(2, 9)}`;

  value = '';
  onChange: any = () => {};
  onTouched: any = () => {};

  get inputClasses(): string[] {
    const base = [
      'block',
      'w-full',
      'rounded-xl',
      'border',
      'transition-all',
      'duration-200',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-[#6254E5]',
      'focus:border-transparent',
      'disabled:bg-gray-100',
      'disabled:cursor-not-allowed',
      'disabled:text-gray-500',
    ];

    const spacing = this.icon ? ['pl-11', 'pr-4', 'py-3'] : ['px-4', 'py-3'];
    const textSize = this.type === 'textarea' ? ['text-sm'] : ['text-base'];
    const border = this.error 
      ? ['border-red-300', 'focus:ring-red-500'] 
      : ['border-gray-200', 'hover:border-gray-300'];

    const shadow = this.error 
      ? ['shadow-sm'] 
      : ['shadow-[0_1px_3px_rgba(0,0,0,0.04)]', 'hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]'];

    return [...base, ...spacing, ...textSize, ...border, ...shadow];
  }

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    this.value = target.value;
    this.onChange(this.value);
  }
}

