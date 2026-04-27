import { Component } from '@angular/core';
import {
  trigger,
  state,
  transition,
  style,
  animate,
} from '@angular/animations';

interface Role {
  id: 'jobseeker' | 'employer';
  title: string;
  icon: string;
  iconColor: string;
  description: string;
  features: string[];
  tooltip: string;
}

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('300ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '500ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate(
          '300ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 0, transform: 'translateY(20px)' })
        ),
      ]),
    ]),
    trigger('slideInLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate(
          '400ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'translateX(0)' })
        ),
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateX(0)' }),
        animate(
          '300ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 0, transform: 'translateX(-20px)' })
        ),
      ]),
    ]),
    trigger('cardScale', [
      state('default', style({ transform: 'scale(1)' })),
      state('hover', style({ transform: 'scale(1.02)' })),
      transition(
        'default <=> hover',
        animate('300ms cubic-bezier(0.35, 0, 0.25, 1)')
      ),
    ]),
  ],
})
export class SignupComponent {
  selectedRole: 'jobseeker' | 'employer' | null = null;
  roleSelected = false;
  isLoading = false;

  roles: Role[] = [
    {
      id: 'jobseeker',
      title: 'Job Seeker',
      icon: 'user-tie',
      iconColor: 'blue',
      description: 'Find opportunities that match your skills and career goals',
      features: [
        'Discover relevant job openings',
        'Showcase your professional profile',
        'Get matched with ideal employers',
      ],
      tooltip: 'Perfect for candidates looking for their next opportunity',
    },
    {
      id: 'employer',
      title: 'Employer',
      icon: 'building',
      iconColor: 'indigo',
      description: 'Connect with qualified candidates for your open positions',
      features: [
        'Post and promote job listings',
        'Search candidate database',
        'Track and manage applications',
      ],
      tooltip: 'Ideal for companies seeking qualified candidates',
    },
  ];

  selectRole(role: 'jobseeker' | 'employer') {
    this.selectedRole = role;
    console.log('Selected role:', this.selectedRole);
  }

  continueToSignup() {
    if (this.selectedRole) {
      this.isLoading = true;
      // Simulate backend processing with a slight delay
      setTimeout(() => {
        this.roleSelected = true;
        this.isLoading = false;
        console.log('Role selected state:', this.roleSelected);
      }, 1000);
    }
  }

  goBack() {
    this.roleSelected = false;
    // No need for timeout, just reset the selection immediately
    this.selectedRole = null;
  }

  handleKeyDown(event: KeyboardEvent, role: 'jobseeker' | 'employer') {
    if (event.key === 'Enter' || event.key === ' ') {
      this.selectRole(role);
      event.preventDefault();
    }
  }
}
