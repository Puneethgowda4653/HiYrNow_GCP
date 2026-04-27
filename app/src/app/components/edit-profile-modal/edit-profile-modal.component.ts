import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-edit-profile-modal',
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div class="bg-white w-full max-w-4xl rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col relative">
        <!-- Modal Header -->
        <div class="sticky top-0 bg-white border-b z-20 px-6 py-4">
          <div class="flex justify-between items-center">
            <h2 class="text-xl md:text-2xl font-semibold">{{getModalTitle()}}</h2>
            <button (click)="closeModal()" class="text-gray-500 hover:text-gray-700 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <!-- Section Dropdown - Desktop -->
          <div *ngIf="editMode === 'profile'" class="mt-6 hidden md:block">
            <div class="relative">
              <button 
                (click)="toggleDesktopDropdown()"
                class="w-full md:w-64 px-4 py-2 text-left bg-white border rounded-lg shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors"
              >
                <span class="flex items-center">
                  <span class="mr-2">{{getCurrentSectionIcon()}}</span>
                  <span>{{getCurrentSectionLabel()}}</span>
                </span>
                <svg 
                  class="w-5 h-5 text-gray-500 transition-transform duration-200"
                  [class.rotate-180]="isDesktopDropdownOpen"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              <!-- Desktop Dropdown Menu -->
              <div 
                *ngIf="isDesktopDropdownOpen"
                class="absolute mt-2 w-full md:w-64 bg-white border rounded-lg shadow-lg py-2 z-30"
              >
                <button 
                  *ngFor="let section of profileSections"
                  (click)="selectSection(section.id)"
                  class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                  [class.text-indigo-600]="activeSection === section.id"
                  [class.bg-indigo-50]="activeSection === section.id"
                >
                  <span class="mr-3">{{section.icon}}</span>
                  <span>{{section.label}}</span>
                </button>
              </div>
            </div>

            <!-- Progress Indicator -->
            <div class="hidden md:flex items-center space-x-2 mt-4">
              <div 
                *ngFor="let section of profileSections; let i = index"
                class="flex-1 h-1 rounded-full transition-colors duration-200"
                [class.bg-indigo-600]="getSectionIndex(activeSection) >= i"
                [class.bg-gray-200]="getSectionIndex(activeSection) < i"
              ></div>
            </div>
          </div>

          <!-- Mobile Section Selector -->
          <div *ngIf="editMode === 'profile'" class="mt-4 md:hidden">
            <button 
              (click)="toggleMobileMenu()"
              class="w-full px-4 py-3 text-left bg-white border rounded-lg shadow-sm flex items-center justify-between"
            >
              <span class="flex items-center">
                <span class="mr-2">{{getCurrentSectionIcon()}}</span>
                <span>{{getCurrentSectionLabel()}}</span>
              </span>
              <svg 
                class="w-5 h-5 text-gray-500"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="flex-1 overflow-y-auto p-4 md:p-6">
          <!-- Resume Upload -->
          <div *ngIf="editMode === 'resume'" class="space-y-4">
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div class="mx-auto w-12 h-12 mb-4 text-gray-400">
                <svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 class="text-lg font-medium">Drop your resume here</h3>
              <p class="text-sm text-gray-500 mt-2">or click to browse</p>
            </div>
            <app-resume-upload (uploadComplete)="handleUploadComplete()">
            </app-resume-upload>
          </div>

          <!-- Profile Sections -->
          <div *ngIf="editMode === 'profile'" class="animate-fadeIn">
            <div [ngSwitch]="activeSection">
              <app-personal-info 
                *ngSwitchCase="'personal'"
                [userData]="userData"
                (saved)="handleSectionSave('personal')"
                class="block">
              </app-personal-info>

              <app-experience-list 
                *ngSwitchCase="'experience'"
                [experiences]="userData?.experiences"
                (saved)="handleSectionSave('experience')"
                class="block">
              </app-experience-list>

              <app-education-list
                *ngSwitchCase="'education'"
                [education]="userData?.education"
                (saved)="handleSectionSave('education')"
                class="block">
              </app-education-list>

              <app-skill-list
                *ngSwitchCase="'skills'"
                [skills]="userData?.skills"
                (saved)="handleSectionSave('skills')"
                class="block">
              </app-skill-list>

              <app-project-list
                *ngSwitchCase="'projects'"
                [projects]="userData?.projects"
                (saved)="handleSectionSave('projects')"
                class="block">
              </app-project-list>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-white border-t p-4 md:p-6">
          <div class="flex justify-between md:justify-end space-x-4">
            <button 
              *ngIf="editMode === 'profile' && getSectionIndex(activeSection) > 0"
              (click)="goToPreviousSection()"
              class="px-4 md:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Previous
            </button>
            <div class="flex space-x-4">
              <button 
                (click)="closeModal()"
                class="px-4 md:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button 
                *ngIf="editMode === 'profile'"
                (click)="handleSectionSave(activeSection)"
                class="px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                {{isLastSection() ? 'Finish' : 'Next'}}
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Full Screen Menu -->
        <div 
          *ngIf="isMobileMenuOpen"
          class="fixed inset-0 bg-white z-30 md:hidden animate-slideIn">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-semibold">Choose Section</h2>
              <button (click)="toggleMobileMenu()" class="text-gray-500">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="space-y-2">
              <button 
                *ngFor="let section of profileSections"
                (click)="selectMobileSection(section.id)"
                class="w-full p-4 rounded-lg flex items-center text-left transition-colors"
                [class.bg-indigo-50]="activeSection === section.id"
                [class.text-indigo-600]="activeSection === section.id"
                [class.text-gray-700]="activeSection !== section.id"
              >
                <span class="flex items-center flex-1">
                  <span class="text-2xl mr-4">{{section.icon}}</span>
                  <span class="flex flex-col">
                    <span class="font-medium">{{section.label}}</span>
                    <span class="text-sm text-gray-500">{{getSectionDescription(section.id)}}</span>
                  </span>
                </span>
                <svg 
                  *ngIf="activeSection === section.id"
                  class="w-5 h-5 text-indigo-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Loading Overlay -->
        <div *ngIf="isLoading" 
             class="absolute inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center z-40">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-in-out;
    }
    .animate-slideIn {
      animation: slideIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    :host {
      display: contents;
    }
  `]
})
export class EditProfileModalComponent {
  @Input() isOpen: boolean = false;
  @Input() editMode: 'resume' | 'profile' = 'profile';
  @Input() userData: any;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() updateComplete = new EventEmitter<{section: string, data: any}>();

  activeSection: string = 'personal';
  isLoading: boolean = false;
  isMobileMenuOpen: boolean = false;
  isDesktopDropdownOpen: boolean = false;

  profileSections = [
    { id: 'personal', label: 'Personal Info', icon: '👤', description: 'Basic information about you' },
    { id: 'experience', label: 'Experience', icon: '💼', description: 'Your work history' },
    { id: 'education', label: 'Education', icon: '🎓', description: 'Academic background' },
    { id: 'skills', label: 'Skills', icon: '⚡', description: 'Your expertise' },
    { id: 'projects', label: 'Projects', icon: '🚀', description: 'Portfolio of work' }
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  getModalTitle(): string {
    return this.editMode === 'resume' ? 'Update Resume' : 'Edit Profile';
  }

  getCurrentSectionIcon(): string {
    return this.profileSections.find(s => s.id === this.activeSection)?.icon || '';
  }

  getCurrentSectionLabel(): string {
    return this.profileSections.find(s => s.id === this.activeSection)?.label || '';
  }

  getSectionDescription(sectionId: string): string {
    return this.profileSections.find(s => s.id === sectionId)?.description || '';
  }

  getSectionIndex(sectionId: string): number {
    return this.profileSections.findIndex(s => s.id === sectionId);
  }

  isLastSection(): boolean {
    return this.getSectionIndex(this.activeSection) === this.profileSections.length - 1;
  }

  toggleDesktopDropdown(): void {
    this.isDesktopDropdownOpen = !this.isDesktopDropdownOpen;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  selectSection(sectionId: string): void {
    this.activeSection = sectionId;
    this.isDesktopDropdownOpen = false;
  }

  selectMobileSection(sectionId: string): void {
    this.activeSection = sectionId;
    this.isMobileMenuOpen = false;
  }

  goToPreviousSection(): void {
    const currentIndex = this.getSectionIndex(this.activeSection);
    if (currentIndex > 0) {
      this.activeSection = this.profileSections[currentIndex - 1].id;
    }
  }

  handleSectionSave(section: string): void {
    this.isLoading = true;
    
    setTimeout(() => {
      this.isLoading = false;
      this.updateComplete.emit({ section, data: null });
      
      const currentIndex = this.profileSections.findIndex(s => s.id === section);
      if (currentIndex < this.profileSections.length - 1) {
        this.activeSection = this.profileSections[currentIndex + 1].id;
      }
      
      this.cdr.detectChanges();
    }, 500);
  }

  handleUploadComplete(): void {
    this.updateComplete.emit({ section: 'resume', data: null });
  }

  closeModal(): void {
    this.activeSection = 'personal';
    this.isMobileMenuOpen = false;
    this.closeModalEvent.emit();
  }
}