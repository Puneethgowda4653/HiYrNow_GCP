import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
// import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-settings',
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <!-- Settings Tabs -->
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex">
            <button 
              *ngFor="let tab of tabs" 
              (click)="activeTab = tab.id"
              class="w-1/3 py-4 text-center transition-colors duration-300"
              [ngClass]="{
                'border-b-2 border-blue-500 text-blue-600': activeTab === tab.id,
                'text-gray-500 hover:text-gray-700': activeTab !== tab.id
              }"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

         <!-- Password Settings -->
        <div *ngIf="activeTab === 'password'" class="p-6">
         <app-password-reset></app-password-reset>
        </div>

        <!-- Profile Settings -->
        <div *ngIf="activeTab === 'profile'" class="p-6">
          <h2 class="text-2xl font-semibold mb-6">Profile Settings</h2>
          <form [formGroup]="profileForm" (ngSubmit)="updateProfile()">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">First Name</label>
                <input 
                  type="text" 
                  formControlName="firstName"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Last Name</label>
                <input 
                  type="text" 
                  formControlName="lastName"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                >
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700">Email</label>
                <input 
                  type="email" 
                  formControlName="email"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                >
              </div>
              
              <!-- Role-Specific Fields -->
              <ng-container *ngIf="user.role === 'JobSeeker'">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700">Resume</label>
                  <input 
                    type="file" 
                    (change)="onResumeUpload($event)"
                    class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  >
                </div>
              </ng-container>

              <ng-container *ngIf="user.role === 'Recruiter'">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700">Company</label>
                  <input 
                    type="text" 
                    formControlName="company"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                  >
                </div>
              </ng-container>
            </div>

            <button 
              type="submit" 
              class="mt-6 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Update Profile
            </button>
          </form>
        </div>

       

        <!-- Preferences Settings -->
        <div *ngIf="activeTab === 'preferences'" class="p-6">
          <h2 class="text-2xl font-semibold mb-6">Preferences</h2>
          <div class="space-y-4">
            <!-- Job Seeker Preferences -->
            <ng-container *ngIf="user.role === 'JobSeeker'">
              <div class="flex items-center justify-between">
                <span class="text-gray-700">Receive Job Recommendations</span>
                <input 
                  type="checkbox" 
                  [(ngModel)]="jobRecommendations"
                  class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                >
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-700">Email Notifications</span>
                <input 
                  type="checkbox" 
                  [(ngModel)]="emailNotifications"
                  class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                >
              </div>
            </ng-container>

            <!-- Recruiter Preferences -->
            <ng-container *ngIf="user.role === 'Recruiter'">
              <div class="flex items-center justify-between">
                <span class="text-gray-700">Receive Candidate Alerts</span>
                <input 
                  type="checkbox" 
                  [(ngModel)]="candidateAlerts"
                  class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                >
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-700">Public Profile</span>
                <input 
                  type="checkbox" 
                  [(ngModel)]="publicProfile"
                  class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                >
              </div>
            </ng-container>

            <button 
              (click)="savePreferences()"
              class="mt-6 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Additional custom styles can be added here if needed */
  `]
})
export class SettingsComponent implements OnInit {
  activeTab: string = 'password';
  tabs = [
    // { id: 'profile', label: 'Profile' },
    { id: 'password', label: 'Password' },
    // { id: 'preferences', label: 'Preferences' }
  ];

  user: any;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // Preference toggles
  jobRecommendations: boolean = true;
  emailNotifications: boolean = true;
  candidateAlerts: boolean = true;
  publicProfile: boolean = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    // private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Fetch current user details
    // this.user = this.userService.findLoggedUser();
    // this.initializeForms();
  }

  
 
}