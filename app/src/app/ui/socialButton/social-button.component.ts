import { Component, Input, Output, EventEmitter } from '@angular/core';

export type SocialProvider = 'google' | 'linkedin' | 'email';

@Component({
  selector: 'app-social-button',
  standalone: false,
  templateUrl: './social-button.component.html',
  styleUrls: ['./social-button.component.css']
})
export class SocialButtonComponent {
  @Input() provider: SocialProvider = 'google';
  @Input() label: string = '';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Output() clicked = new EventEmitter<SocialProvider>();

  get providerLabel(): string {
    if (this.label) return this.label;
    switch (this.provider) {
      case 'google':
        return 'Continue with Google';
      case 'linkedin':
        return 'Continue with LinkedIn';
      case 'email':
        return 'Continue with Email';
      default:
        return 'Continue';
    }
  }

  onClick() {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(this.provider);
    }
  }
}

