// contact-dialog.component.ts
import { Component, Input } from '@angular/core';

interface SocialContact {
  socialtype: string;
  url: string;
}

interface UserData {
  email: string;
  phone: string;
  socialContact: SocialContact[];
}

@Component({
  selector: 'app-contact-dialog',
  template: `
    <div 
      *ngIf="isOpen" 
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      (click)="closeOnBackdrop($event)">
      
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-fade-in">
        <!-- Header -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold text-gray-800">Contact Information</h3>
            <button 
              (click)="close()"
              class="text-gray-400 hover:text-gray-600 transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="p-6 space-y-6">
          <!-- Email -->
          <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-all">
            <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-envelope text-indigo-500"></i>
            </div>
            <div>
              <div class="text-sm text-gray-500">Email</div>
              <a [href]="'mailto:' + userData.user?.email" 
                 class="text-indigo-600 hover:text-indigo-700 font-medium">
                {{userData.user?.email}}
              </a>
            </div>
            <button 
              (click)="copyToClipboard(userData.user?.email)"
              class="ml-auto p-2 text-gray-400 hover:text-indigo-600 transition-colors">
              <i class="fas fa-copy"></i>
            </button>
          </div>

          <!-- Phone -->
          <div *ngIf="userData.user?.phone" class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-all">
            <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-phone text-indigo-500"></i>
            </div>
            <div>
              <div class="text-sm text-gray-500">Phone</div>
              <a [href]="'tel:' + userData.user?.phone" 
                 class="text-indigo-600 hover:text-indigo-700 font-medium">
                {{userData.user?.phone}}
              </a>
            </div>
            <button 
              (click)="copyToClipboard(userData.user?.phone)"
              class="ml-auto p-2 text-gray-400 hover:text-indigo-600 transition-colors">
              <i class="fas fa-copy"></i>
            </button>
          </div>

          <!-- Social Accounts -->
        <div *ngIf="userData.user?.socialContact?.length" class="space-y-4 p-2 ">

            <div class="flex items-center p-2 justify-center">
              <a *ngFor="let social of userData.user?.socialContact"
                 [href]="social.url"
                 target="_blank"
                 class="flex items-center gap-4 p-2  bg-gray-50 rounded-lg  hover:bg-indigo-50 transition-all">
                <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <i [class]="'fab fa-' + social.socialtype + ' text-indigo-500'"></i>
                </div>
              </a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-200">
          <button
            (click)="close()"
            class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.2s ease-out;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `]
})
export class ContactDialogComponent {
  @Input() userData: UserData | null = null;
  isOpen = false;

  open() {
    this.isOpen = true;
    console.log("fgxfgxhgxh",this.userData)
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    document.body.style.overflow = '';
  }

  closeOnBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.close();
    }
  }

  getSocialName(type: string): string {
    const socialNames: { [key: string]: string } = {
      github: 'GitHub',
      linkedin: 'LinkedIn',
      twitter: 'Twitter',
      facebook: 'Facebook',
      instagram: 'Instagram',
      // Add more social networks as needed
    };
    return socialNames[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  async copyToClipboard(text: string | undefined) {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      // You might want to show a toast notification here
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
}

// contact-dialog.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContactDialogService {
  private dialogSubject = new Subject<boolean>();
  dialogState$ = this.dialogSubject.asObservable();

  openDialog() {
    this.dialogSubject.next(true);
  }

  closeDialog() {
    this.dialogSubject.next(false);
  }
}