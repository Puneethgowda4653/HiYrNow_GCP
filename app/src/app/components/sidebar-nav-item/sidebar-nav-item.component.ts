import { Component, Input } from '@angular/core';

@Component({
  selector: 'SidebarNavItem',
  template: `
    <a
      [routerLink]="routerLink"
      routerLinkActive="active"
      class="relative flex items-center py-3 text-gray-600 hover:text-brand-end transition-all duration-300 group rounded-xl mx-2 mb-1 hover:bg-gradient-to-r hover:from-brand-start/5 hover:to-brand-end/5"
      [attr.aria-label]="label"
    >
      <!-- Active indicator with brand blue colors -->
      <div
        class="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-brand-start to-brand-end rounded-r-full opacity-0 group-[.active]:opacity-100 transition-all duration-300"
      ></div>
      <!-- Icon container with HiYrNow brand styling -->
      <div
        class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100/50 group-hover:bg-gradient-to-br group-hover:from-brand-start/10 group-hover:to-brand-end/10 transition-all duration-300 group-[.active]:bg-gradient-to-br group-[.active]:from-brand-start group-[.active]:to-brand-end group-[.active]:shadow-lg group-[.active]:shadow-brand-end/25"
      >
        <!-- User/Profile Icon -->
        <svg
          *ngIf="icon === 'user'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a8 8 0 00-8 8h16a8 8 0 00-8-8z"
          />
        </svg>
        <!-- Dashboard Icon -->
        <svg
          *ngIf="icon === 'dashboard'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <!-- Briefcase/Jobs Icon -->
        <svg
          *ngIf="icon === 'briefcase'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <!-- Settings Icon -->
        <svg
          *ngIf="icon === 'settings'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <!-- Manage Jobs Icon -->
        <svg
          *ngIf="icon === 'manage-jobs'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5h6m-7 4h8m-8 4h8m-8 4h8M9 3h6a2 2 0 012 2v1H7V5a2 2 0 012-2zM7 7h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z"
          />
        </svg>
        <!-- Users Icon -->
        <svg
          *ngIf="icon === 'users'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <!-- Search Icon -->
        <svg
          *ngIf="icon === 'search'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <!-- Saved/Bookmark Icon -->
        <svg
          *ngIf="icon === 'saved'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        <!-- Bell/Notification Icon -->
        <svg
          *ngIf="icon === 'notifications'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <!-- Message Icon -->
        <svg
          *ngIf="icon === 'messages'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <!-- File/Resume Icon -->
        <svg
          *ngIf="icon === 'resume'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <!-- Chart/Analytics Icon -->
        <svg
          *ngIf="icon === 'analytics'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <!-- Credit Card/Plan Icon -->
        <svg
          *ngIf="icon === 'plan'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>

              <!-- Plan Usage Icon -->
<svg
  *ngIf="icon === 'plan-usage'"
  class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
  fill="none"
  stroke="currentColor"
  viewBox="0 0 24 24"
>
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    d="M11 19a8 8 0 100-16v8H3a8 8 0 008 8z"
  />
</svg>


        <!-- Sparkles/AI Icon -->
        <svg
          *ngIf="icon === 'ai'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        <!-- Gift/Referral Icon -->
        <svg
          *ngIf="icon === 'referral'"
          class="w-5 h-5 text-gray-600 group-hover:text-brand-end group-[.active]:text-white transition-all duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
      </div>


      <!-- Label with modern typography -->
      <span
        *ngIf="!isCompact"
        class="ml-3 text-sm font-semibold text-gray-700 group-hover:text-brand-end group-[.active]:text-brand-end transition-all duration-300"
      >
        {{ label }}
      </span>

      <!-- Badge for new/beta features -->
      <span
        *ngIf="badge && !isCompact"
        class="ml-auto px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-brand-start to-brand-end text-white rounded-full"
      >
        {{ badge }}
      </span>

      <!-- Active indicator dot -->
      <div
        *ngIf="!isCompact"
        class="absolute right-2 opacity-0 group-[.active]:opacity-100 transition-all duration-300"
      >
        <div
          class="w-2 h-2 bg-gradient-to-r from-brand-start to-brand-end rounded-full animate-pulse"
        ></div>
      </div>
    </a>
  `,
  styles: [
    `
      /* --- HiYrNow Brand Color Palette --- */
      .primary-bg {
        background-color: #33034f !important;
      }
      .primary-text {
        color: #33034f !important;
      }
      .primary-border {
        border-color: #33034f !important;
      }

      .secondary-bg {
        background-color: #af19e1 !important;
      }
      .secondary-text {
        color: #af19e1 !important;
      }
      .secondary-border {
        border-color: #af19e1 !important;
      }

      .dark-text {
        color: #333333 !important;
      }
      .dark-bg {
        background-color: #333333 !important;
      }

      .light-bg {
        background-color: #f5f5f5 !important;
      }
      .light-text {
        color: #f5f5f5 !important;
      }

      .white-bg {
        background-color: #ffffff !important;
      }
      .white-text {
        color: #ffffff !important;
      }

      /* Gradient utility for HiYrNow brand */
      .primary-gradient-background {
        background: linear-gradient(135deg, #33034f 0%, #af19e1 100%) !important;
      }
      .primary-gradient {
        background: linear-gradient(135deg, #33034f 0%, #af19e1 100%) !important;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      /* Button utility classes */
      .btn-primary {
        background-color: #33034f !important;
        color: #ffffff !important;
        border: none;
      }
      .btn-primary:hover {
        background-color: #af19e1 !important;
      }

      .btn-secondary {
        background-color: #af19e1 !important;
        color: #ffffff !important;
        border: none;
      }
      .btn-secondary:hover {
        background-color: #33034f !important;
      }

      /* Link utility */
      .link-primary {
        color: #33034f !important;
      }
      .link-primary:hover {
        color: #af19e1 !important;
      }

      /* Accent for icons */
      .icon-primary {
        color: #33034f !important;
      }
      .icon-secondary {
        color: #af19e1 !important ;
      }

      /* --- End Custom Color Palette --- */
    `,
  ],
})
export class SidebarNavItemComponent {
  @Input()
  routerLink!: string | string[];
  @Input()
  icon!: 'user' | 'dashboard' | 'briefcase' | 'settings' | 'manage-jobs' | 'users' | 'search' | 'saved' | 'notifications' | 'messages' | 'resume' | 'analytics' | 'plan' | 'ai' | 'referral'|'plan-usage';
  @Input()
  label!: string;
  @Input() 
  isCompact: boolean = false;
  @Input()
  badge?: string; // For "new" or "beta" badges
}
