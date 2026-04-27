import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  feedback: string[];
}

@Component({
  selector: 'app-password-strength',
  standalone: false,
  templateUrl: './password-strength.component.html',
  styleUrls: ['./password-strength.component.css']
})
export class PasswordStrengthComponent implements OnChanges {
  @Input() password: string = '';
  strength: PasswordStrength = { score: 0, label: '', feedback: [] };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['password']) {
      this.calculateStrength();
    }
  }

  calculateStrength() {
    if (!this.password) {
      this.strength = { score: 0, label: '', feedback: [] };
      return;
    }

    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (this.password.length >= 8) {
      score++;
    } else {
      feedback.push('Use at least 8 characters');
    }

    if (this.password.length >= 12) {
      score++;
    }

    // Uppercase check
    if (/[A-Z]/.test(this.password)) {
      score++;
    } else {
      feedback.push('Add uppercase letters');
    }

    // Lowercase check
    if (/[a-z]/.test(this.password)) {
      score++;
    } else {
      feedback.push('Add lowercase letters');
    }

    // Number check
    if (/\d/.test(this.password)) {
      score++;
    } else {
      feedback.push('Add numbers');
    }

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(this.password)) {
      score++;
    } else {
      feedback.push('Add special characters');
    }

    // Cap score at 4
    score = Math.min(score, 4);

    // Determine label
    let label = '';
    if (score === 0) label = '';
    else if (score === 1) label = 'Weak';
    else if (score === 2) label = 'Fair';
    else if (score === 3) label = 'Good';
    else label = 'Strong';

    this.strength = { score, label, feedback: feedback.slice(0, 2) };
  }

  getStrengthColor(): string {
    if (this.strength.score === 0) return 'bg-slate-200';
    if (this.strength.score === 1) return 'bg-red-400';
    if (this.strength.score === 2) return 'bg-orange-400';
    if (this.strength.score === 3) return 'bg-yellow-400';
    return 'bg-green-400';
  }

  getStrengthTextColor(): string {
    if (this.strength.score === 0) return 'text-slate-500';
    if (this.strength.score === 1) return 'text-red-600';
    if (this.strength.score === 2) return 'text-orange-600';
    if (this.strength.score === 3) return 'text-yellow-600';
    return 'text-green-600';
  }
}

