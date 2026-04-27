import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-otp-input',
  standalone: false,
  templateUrl: './otp-input.component.html',
  styleUrls: ['./otp-input.component.css']
})
export class OtpInputComponent implements AfterViewInit {
  @Input() length: number = 6;
  @Input() disabled: boolean = false;
  @Output() otpChange = new EventEmitter<string>();
  @ViewChild('otpContainer') otpContainer!: ElementRef;

  otpValues: string[] = Array(6).fill('');

  ngAfterViewInit() {
    setTimeout(() => {
      const firstInput = this.otpContainer?.nativeElement?.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 0);
  }

  onInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;

    // Strip non-numeric characters
    const raw = input.value.replace(/[^0-9]/g, '');

    // Handle paste (multiple characters typed or pasted into one box)
    if (raw.length > 1) {
      const chars = raw.slice(0, this.length - index).split('');
      chars.forEach((char, i) => {
        if (index + i < this.length) {
          this.otpValues[index + i] = char;
        }
      });
      this.updateAllInputs();
      const nextIndex = Math.min(index + chars.length, this.length - 1);
      this.focusInput(nextIndex);
      this.emitOtp();
      return;
    }

    // Single character — take only the last typed character
    // (handles case where input already had a value and user types new one)
    const newChar = raw.slice(-1);

    // Clear the input first, then set correct value
    input.value = newChar;
    this.otpValues[index] = newChar;

    this.emitOtp();

    // Move focus to next box only if a digit was entered
    if (newChar && index < this.length - 1) {
      this.focusInput(index + 1);
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (input.value) {
        // Clear current box
        input.value = '';
        this.otpValues[index] = '';
        this.emitOtp();
      } else if (index > 0) {
        // Move to previous box and clear it
        this.otpValues[index - 1] = '';
        this.focusInput(index - 1);
        setTimeout(() => {
          const inputs = this.otpContainer?.nativeElement?.querySelectorAll('input');
          if (inputs && inputs[index - 1]) {
            inputs[index - 1].value = '';
          }
        }, 0);
        this.emitOtp();
      }
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < this.length - 1) {
      event.preventDefault();
      this.focusInput(index + 1);
      return;
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').replace(/[^0-9]/g, '') || '';
    const chars = pastedData.slice(0, this.length).split('');

    // Fill from beginning
    this.otpValues = Array(this.length).fill('');
    chars.forEach((char, i) => {
      this.otpValues[i] = char;
    });

    this.updateAllInputs();
    this.focusInput(Math.min(chars.length, this.length - 1));
    this.emitOtp();
  }

  updateAllInputs() {
    setTimeout(() => {
      const inputs = this.otpContainer?.nativeElement?.querySelectorAll('input');
      if (inputs) {
        inputs.forEach((input: HTMLInputElement, i: number) => {
          input.value = this.otpValues[i] || '';
        });
      }
    }, 0);
  }

  focusInput(index: number) {
    setTimeout(() => {
      const inputs = this.otpContainer?.nativeElement?.querySelectorAll('input');
      if (inputs && inputs[index]) {
        inputs[index].focus();
        // Select existing content so next keystroke replaces it
        inputs[index].select();
      }
    }, 0);
  }

  emitOtp() {
    this.otpChange.emit(this.otpValues.join(''));
  }

  clear() {
    this.otpValues = Array(this.length).fill('');
    this.updateAllInputs();
    this.emitOtp();
    this.focusInput(0);
  }
}