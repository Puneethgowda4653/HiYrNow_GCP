import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate, state } from '@angular/animations';
// import { EarlyAccessService } from './services/early-access.service';
import { Meta, Title } from '@angular/platform-browser';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';

interface ServerFieldErrors {
  [key: string]: string | null;
}
interface PerkItem {
  title: string;
  detail: string;
  count?: string; // e.g. "180 profiles" or "60 analyses"
}

@Component({
  selector: 'app-summit-landing',
  templateUrl: './summit-landing.component.html',
  styleUrls: ['./summit-landing.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-in-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('500ms ease-in-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('popUp', [
      state('hidden', style({ 
        opacity: 0, 
        transform: 'scale(0.8) translateY(30px)' 
      })),
      state('visible', style({ 
        opacity: 1, 
        transform: 'scale(1) translateY(0)' 
      })),
      transition('hidden => visible', [
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)')
      ])
    ])
  ]
})
export class SummitLandingComponent implements OnInit, OnDestroy {
  earlyAccessForm!: FormGroup;
  isSubmitting = signal(false);
  submitSuccess = signal(false);
  submitError = signal<string | null>(null);
  showModal = signal(false);
  isBrowser: boolean;
  isLoggedIn = false;

  // Screenshot rotation
  screenshots: string[] = [
    '/assets/screenshots/ss1.png',
    '/assets/screenshots/ss2.png',
    '/assets/screenshots/ss3.png',
    '/assets/screenshots/ss4.png',
    '/assets/screenshots/ss5.png',
    '/assets/screenshots/dashboardnew.png'
  ];
  currentScreenshotIndex = 0;
  screenshotRotationInterval: any;

  // Perks section visibility
  perksSectionVisible = signal(false);
  showPerksModal = signal(false);
  perksModalShown = false;

  hiringVolumeOptions = [
    '1-10 hires/year',
    '11-50 hires/year',
    '51-100 hires/year',
    '100+ hires/year'
  ];

  features = [
    {
      icon: '🎯',
      title: 'AI Matching',
      description: 'AI-curated candidate matches — hire faster with skills-first scoring.'
    },
    {
      icon: '✨',
      title: 'Ethical Hiring',
      description: 'Ethical hiring — no scraping, no talent-selling, bias-aware matching.'
    },
    {
      icon: '⚡',
      title: 'Recruiter Automation',
      description: 'Recruiter automation — focus on interviews, not admin.'
    }
  ];

  steps = [
    { label: 'Post Job', icon: '📝', description: 'Create detailed job descriptions' },
    { label: 'AI Match & Screen', icon: '🤖', description: 'Smart candidate matching' },
    { label: 'Interview Ready', icon: '✅', description: 'Pre-vetted candidates' }
  ];

  benefits = [
    { title: 'Save Time', description: '70% faster hiring', icon: '⏱️' },
    { title: 'Better Quality', description: 'Skills-first matching', icon: '💎' },
    { title: 'Bias-Reduced', description: 'Fair & transparent', icon: '⚖️' },
    { title: 'Analytics', description: 'Data-driven insights', icon: '📊' }
  ];

  // perks = [
  //   'Free premium access worth ₹25,000',
  //   'Priority support & founder feedback',
  //   'Exclusive roadmap previews',
  //   'Beta feature early access'
  // ];
  perks: PerkItem[] = [
    {
      title: 'Top candidate profiles — curated',
      detail: 'Access to hand-picked, top-tier candidate profiles selected by our talent team.',
      count: '180 profiles',
    },
    {
      title: 'AI Profile Analyses',
      detail: 'Comprehensive AI-driven profile analysis including skill maps, gap recommendations, and ATS-compatibility checks.',
      count: '60 analyses',
    },
    {
      title: 'AI JD Generator',
      detail: 'Generate outcome-driven, bias-aware job descriptions and interview plans using our JD generator.',
      count: '30 JDs',
    },
    {
      title: 'Job Postings',
      detail: 'Publish and promote roles using our platform with basic ATS integration for applicant tracking.',
      count: '60 postings',
    },
    {
      title: 'Duration & Integration',
      detail: 'All perks valid for 6 months and include Basic ATS integration and onboarding support.',
      count: '6 months',
    },
  ];


  // Partner companies - matching job board component style
  earlyPartners: string[] = [
    'BigBasket',
    'Rapido',
    'Cricbuzz',
    'Cleo',
    'Digit',
    'Urban Company',
    'Purecode.AI',
    'Green Robotics',
    'Arting Digital',
    'Stack.AI',
    'Rashi Ecotourism',
    'Clusterzap.AI',
    'Dwiggly'
  ];

  testimonials = [
    {
      name: 'Priya Sharma',
      role: 'VP Talent, Bigbasket India',
      company: 'Bigbasket',
      avatar: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=6366f1&color=fff',
      quote: 'HiYrNow cut our hiring time by 60%. The AI matching is incredibly accurate.'
    },
    {
      name: 'Rahul Mehta',
      role: 'HR Director, Rapido',
      company: 'Rapido',
      avatar: 'https://ui-avatars.com/api/?name=Rahul+Mehta&background=8b5cf6&color=fff',
      quote: 'Finally, a platform that respects both candidates and employers. Game-changer.'
    },
    {
      name: 'Nikhil',
      role: 'Founder, Clusterzap.AI',
      company: 'Clusterzap.AI',
      avatar: 'https://ui-avatars.com/api/?name=Nikhil&background=ec4899&color=fff',
      quote: 'The ethical approach and quality of matches is unmatched in the market.'
    }
  ];

  constructor(
    private fb: FormBuilder,
    // private earlyAccessService: EarlyAccessService,
    private meta: Meta,
    private title: Title,
    @Inject(PLATFORM_ID) platformId: Object,
    private userService: UserService,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    console.log('ngOnInit called, isBrowser:', this.isBrowser);
    this.initForm();
    this.setMetaTags();
    if (this.isBrowser) {
      console.log('Calling checkLoginStatus...');
      this.checkLoginStatus()
        .then(() => {
          console.log('checkLoginStatus completed, isLoggedIn:', this.isLoggedIn);
          this.initScrollAnimations();
          this.startScreenshotRotation();
          this.showPerksModalAfterDelay();
        })
        .catch((error) => {
          console.error('Error in checkLoginStatus:', error);
          this.initScrollAnimations();
          this.startScreenshotRotation();
          this.showPerksModalAfterDelay();
        });
    } else {
      console.log('Not in browser, skipping login check');
    }
  }

  showPerksModalAfterDelay(): void {
    // Show modal 2 seconds after page load (after login status is checked)
    console.log('showPerksModalAfterDelay called, current isLoggedIn:', this.isLoggedIn);
    setTimeout(() => {
      console.log('Timeout fired, perksModalShown:', this.perksModalShown);
      if (!this.perksModalShown) {
        // Re-check login status to ensure it's up to date
        console.log('Re-checking login status before showing modal...');
        this.checkLoginStatus().then(() => {
          console.log('Final check complete, isLoggedIn:', this.isLoggedIn);
          this.showPerksModal.set(true);
          this.perksModalShown = true;
          if (this.isBrowser) {
            document.body.style.overflow = 'hidden';
          }
        });
      }
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.screenshotRotationInterval) {
      clearInterval(this.screenshotRotationInterval);
    }
    if (this.isBrowser) {
      document.body.style.overflow = 'auto';
    }
  }

  closePerksModal(): void {
    this.showPerksModal.set(false);
    this.perksModalShown = true; // Mark as shown so it doesn't show again
    if (this.isBrowser) {
      document.body.style.overflow = 'auto';
    }
  }

  onClaimPerks(): void {
    // Navigate to signup for non-logged-in users
    this.closePerksModal();
    this.router.navigate(['/events/signup']).catch((error) => {
      console.error('Navigation error:', error);
      if (this.isBrowser && typeof window !== 'undefined') {
        window.location.href = '/events/signup';
      }
    });
  }

  onEnjoyAccess(): void {
    // Navigate to home for logged-in users
    this.closePerksModal();
    this.router.navigate(['/']).catch((error) => {
      console.error('Navigation error:', error);
      if (this.isBrowser && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    });
  }


  demoCall(): void {
    this.router.navigate(['/demo']);
  }

  
  initForm(): void {
    this.earlyAccessForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      company: [''],
      role: [''],
      hiringVolume: ['']
    });
  }

  navigateToDashboard(): void {
    if (this.isBrowser) {
      this.router.navigate(['/company/dashboard']).catch((error) => {
        console.error('Navigation error:', error);
        // Fallback to window location if router navigation fails
        if (typeof window !== 'undefined') {
          window.location.href = '/company/dashboard';
        }
      });
    }
  }

  private checkLoginStatus(): Promise<void> {
    console.log('checkLoginStatus method called');
    return this.userService
      .findLoggedUser()
      .then((recruiter) => {
        console.log('findLoggedUser response:', recruiter);
        const isAuthenticated =
          recruiter && !recruiter.error && (recruiter._id || recruiter.id);
        this.isLoggedIn = !!isAuthenticated;
        console.log('isLoggedIn set to:', this.isLoggedIn, 'recruiter:', recruiter);
        return Promise.resolve();
      })
      .catch((error) => {
        console.error('Error in findLoggedUser:', error);
        this.isLoggedIn = false;
        console.log('isLoggedIn set to false due to error');
        return Promise.resolve(); // Resolve even on error to continue execution
      });
  }

  setMetaTags(): void {
    this.title.setTitle('HiYrNow - AI-Powered Hiring Platform | Early Access');
    
    this.meta.addTags([
      { name: 'description', content: 'Join HiYrNow\'s early access - India\'s most intelligent AI-powered hiring platform. Ethical, bias-free recruitment with premium features worth ₹25,000 free.' },
      { name: 'keywords', content: 'AI hiring, recruitment platform, ethical hiring, India jobs, ATS, applicant tracking' },
      { property: 'og:title', content: 'HiYrNow - AI-Powered Hiring Platform' },
      { property: 'og:description', content: 'Transform your hiring with AI-powered matching. Join early access for free premium worth ₹25,000.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: '/assets/hiyrnow-og-image.jpg' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'HiYrNow - AI-Powered Hiring Platform' },
      { name: 'twitter:description', content: 'Join early access for intelligent, ethical hiring.' }
    ]);
  }

  initScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-visible');
        }
      });
    }, observerOptions);

    setTimeout(() => {
      const animatedElements = document.querySelectorAll('.animate-on-scroll');
      animatedElements.forEach(el => observer.observe(el));
    }, 100);
  }

  startScreenshotRotation(): void {
    if (!this.isBrowser || this.screenshots.length === 0) return;
    
    // Rotate every 3 seconds
    this.screenshotRotationInterval = setInterval(() => {
      this.nextScreenshot();
    }, 3000);
  }

  nextScreenshot(): void {
    this.currentScreenshotIndex = (this.currentScreenshotIndex + 1) % this.screenshots.length;
  }

  getCurrentScreenshot(): string {
    return this.screenshots[this.currentScreenshotIndex];
  }

  scrollToSection(sectionId: string): void {
    if (this.isBrowser) {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  openModal(): void {
    this.showModal.set(true);
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    if (this.isBrowser) {
      document.body.style.overflow = 'auto';
    }
  }

  onSubmit(): void {
    if (this.earlyAccessForm.invalid) {
      this.earlyAccessForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const formData = this.earlyAccessForm.value;

    // this.earlyAccessService.register(formData).subscribe({
    //   next: (response) => {
    //     this.isSubmitting.set(false);
    //     this.submitSuccess.set(true);
    //     this.earlyAccessForm.reset();
        
    //     // Track with Google Analytics
    //     if (this.isBrowser && (window as any).dataLayer) {
    //       (window as any).dataLayer.push({
    //         event: 'hiyrnow_early_access_signup',
    //         user_email: formData.email,
    //         company: formData.company
    //       });
    //     }

    //     // Close modal after 3 seconds
    //     setTimeout(() => {
    //       this.closeModal();
    //       this.submitSuccess.set(false);
    //     }, 3000);
    //   },
    //   error: (error) => {
    //     this.isSubmitting.set(false);
    //     this.submitError.set(error.error?.message || 'Something went wrong. Please try again.');
    //   }
    // });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.earlyAccessForm.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} is too short`;
    }
    return null;
  }
}