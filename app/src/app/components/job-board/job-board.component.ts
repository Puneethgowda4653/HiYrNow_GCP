import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate,
  query,
  stagger,
  keyframes,
} from '@angular/animations';
import { BehaviorSubject, Subscription, interval, fromEvent } from 'rxjs';
import {
  takeWhile,
  debounceTime,
  distinctUntilChanged,
  throttleTime,
} from 'rxjs/operators';

interface Feature {
  icon: IconName;
  title: string;
  description: string;
  state?: 'normal' | 'hovered';
}

interface Step {
  id: number;
  title: string;
  icon: string;
  description: string;
  automated: boolean;
  visible: boolean;
  strikeState: 'inactive' | 'active';
  badgeState: 'hidden' | 'visible';
}

interface Stat {
  value: string;
  label: string;
  icon: IconName;
  counterValue?: number;
  targetValue?: number;
  prefix?: string;
  suffix?: string;
}

interface Testimonial {
  name: string;
  position: string;
  company: string;
  quote: string;
  avatar: string;
  rating: number;
}

interface CandidateSkill {
  name: string;
  level: number;
  animatedLevel?: number;
}

interface CandidateData {
  name: string;
  match: number;
  animatedMatch?: number;
  skills: CandidateSkill[];
  availability: string;
  salary: string;
  education: string;
  verified: boolean;
  interestLevel: string;
}

type IconName =
  | 'brain-circuit'
  | 'check-circle'
  | 'users-round'
  | 'shield-check'
  | 'clock'
  | 'calendar'
  | 'users'
  | 'dollar-sign'
  | 'cpu'
  | 'user-check'
  | 'users-many'
  | 'badge'
  | 'zap'
  | 'layout-dashboard'
  | 'verified'
  | 'dna'
  | 'searching'
  | 'filter'
  | 'instant';

@Component({
  selector: 'app-job-board',
  templateUrl: './job-board.component.html',
  styleUrls: ['./job-board.component.css'],
  animations: [
    trigger('fadeInUp', [
      state('void', style({ opacity: 0, transform: 'translateY(30px)' })),
      transition('void => *', [animate('0.8s cubic-bezier(0.16, 1, 0.3, 1)')]),
    ]),
    trigger('fadeInRight', [
      state('void', style({ opacity: 0, transform: 'translateX(-30px)' })),
      transition('void => *', [
        animate('0.8s 0.2s cubic-bezier(0.16, 1, 0.3, 1)'),
      ]),
    ]),
    trigger('fadeInLeft', [
      state('void', style({ opacity: 0, transform: 'translateX(30px)' })),
      transition('void => *', [
        animate('0.8s 0.2s cubic-bezier(0.16, 1, 0.3, 1)'),
      ]),
    ]),
    trigger('pulse', [
      state(
        'normal',
        style({
          transform: 'scale(1)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        })
      ),
      state(
        'hovered',
        style({
          transform: 'scale(1.05)',
          boxShadow: '0 10px 15px rgba(0, 0, 0, 0.15)',
        })
      ),
      transition('normal <=> hovered', [
        animate('0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'),
      ]),
    ]),
    trigger('fadeIn', [
      state('void', style({ opacity: 0, transform: 'translateY(20px)' })),
      transition(':enter', [
        animate(
          '0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('strikeThrough', [
      state('inactive', style({ width: '0%' })),
      state('active', style({ width: '100%' })),
      transition(
        'inactive => active',
        animate('0.6s cubic-bezier(0.65, 0, 0.35, 1)')
      ),
    ]),
    trigger('automatedBadge', [
      state(
        'hidden',
        style({ opacity: 0, transform: 'scale(0.8) translateX(-10px)' })
      ),
      state(
        'visible',
        style({ opacity: 1, transform: 'scale(1) translateX(0)' })
      ),
      transition(
        'hidden => visible',
        animate('0.5s 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)')
      ),
    ]),
    trigger('featuresStagger', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(30px)' }),
            stagger('100ms', [
              animate(
                '0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                style({ opacity: 1, transform: 'translateY(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
    trigger('countAnimation', [
      transition(':increment', [
        animate(
          '1s',
          keyframes([
            style({ transform: 'scale(1)', offset: 0 }),
            style({ transform: 'scale(1.12)', offset: 0.5 }),
            style({ transform: 'scale(1)', offset: 1.0 }),
          ])
        ),
      ]),
    ]),
    trigger('rotate', [
      state('default', style({ transform: 'rotate(0)' })),
      state('rotated', style({ transform: 'rotate(180deg)' })),
      transition('default <=> rotated', animate('0.3s ease-in-out')),
    ]),
    trigger('testimonialCarousel', [
      state('inactive', style({ opacity: 0, transform: 'translateX(100px)' })),
      state('active', style({ opacity: 1, transform: 'translateX(0)' })),
      transition('inactive => active', [
        animate('0.6s cubic-bezier(0.16, 1, 0.3, 1)'),
      ]),
      transition('active => inactive', [
        animate(
          '0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 0, transform: 'translateX(-100px)' })
        ),
      ]),
    ]),
    trigger('skillBarAnimation', [
      state('void', style({ width: '0%' })),
      transition('void => *', [
        animate('1s 0.3s cubic-bezier(0.65, 0, 0.35, 1)'),
      ]),
    ]),
    trigger('navbarScroll', [
      state(
        'transparent',
        style({
          backgroundColor: 'rgba(255, 255, 255, 0)',
          boxShadow: 'none',
          padding: '20px 0',
        })
      ),
      state(
        'solid',
        style({
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          padding: '12px 0',
        })
      ),
      transition('transparent <=> solid', [
        animate('0.3s cubic-bezier(0.4, 0, 0.2, 1)'),
      ]),
    ]),
    // 🆕 pulseAnimation added here
    trigger('pulseAnimation', [
      transition('* => *', [
        animate(
          '1s infinite',
          keyframes([
            style({ transform: 'scale(1)', offset: 0 }),
            style({ transform: 'scale(1.05)', offset: 0.5 }),
            style({ transform: 'scale(1)', offset: 1 }),
          ])
        ),
      ]),
    ]),
  ],
})
export class JobBoardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('statsSection') statsSection!: ElementRef;
  @ViewChild('featuresContainer') featuresContainer!: ElementRef;

  // Component state
  buttonState = 'normal';
  isNavOpen = false;
  currentSection = 'hero';
  // Slider state for the feature showcase in template
  currentSlide: number = 0;
  statsVisible = false;
  featuresVisible = false;
  demoVisible = false;
  stepsVisible = false;
  testimonialsVisible = false;
  activeTestimonialIndex = 0;
  showModal = false;
  private modalTimer: any;

  iconPaths: Record<IconName, string> = {
    'brain-circuit':
      'M4.5 17.5c1.04 0 2-.5 2.5-1.5m0-13.5v17m0-17c.5-1 1.5-1.5 2.5-1.5m-2.5 17c.5 1 1.5 1.5 2.5 1.5m0-20c3.5 0 6.5 4 6.5 8s-3 8-6.5 8m0-16v16m0 0c-1 0-2-.5-2.5-1.5m8-5.5c1.5 0 3 .5 4 2m-8-9c1.5-1.5 3-2 5-2s4 .5 5 2m-10 14c1.5 1.5 3 2 5 2s3.5-.5 5-2m-10-7h10',
    'check-circle':
      'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    'users-round':
      'M18 21a8 8 0 10-16 0m16 0a8 8 0 01-16 0m16 0h-16m16 0V10.5a1.5 1.5 0 00-1.5-1.5H15a1.5 1.5 0 00-1.5 1.5m3 10.5V10.5a1.5 1.5 0 00-1.5-1.5H9a1.5 1.5 0 00-1.5 1.5m6 10.5V10.5a1.5 1.5 0 00-1.5-1.5H3a1.5 1.5 0 00-1.5 1.5',
    'shield-check':
      'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    calendar:
      'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    users:
      'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    'dollar-sign':
      'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    cpu: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm5 5h6v6H9V9zM9 2v2M15 2v2M9 22v-2M15 22v-2M2 9h2M2 15h2M22 9h-2M22 15h-2',
    'user-check':
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7 4 2 2 4-4',
    'users-many':
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M17 21v-2a4 4 0 0 0-2-3.45M19 3a4 4 0 0 1 0 7',
    badge:
      'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76ZM12 12v3.5M9 11v.5M15 11v.5M12 8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z',
    zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
    'layout-dashboard':
      'M3 3h7v9H3V3zm11 0h7v5h-7V3zm0 9h7v9h-7v-9zM3 16h7v5H3v-5z',
    // Verified icon (check in circle)
    verified: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',

    // DNA icon (double helix)
    dna: 'M4.5 17.5c1.04 0 2-.5 2.5-1.5m0-13.5v17m0-17c.5-1 1.5-1.5 2.5-1.5m-2.5 17c.5 1 1.5 1.5 2.5 1.5m0-20c3.5 0 6.5 4 6.5 8s-3 8-6.5 8m0-16v16m0 0c-1 0-2-.5-2.5-1.5m8-5.5c1.5 0 3 .5 4 2m-8-9c1.5-1.5 3-2 5-2s4 .5 5 2m-10 14c1.5 1.5 3 2 5 2s3.5-.5 5-2m-10-7h10',

    // Searching icon (magnifying glass)
    searching: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',

    // Filter icon (funnel)
    filter:
      'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',

    // Instant icon (lightning bolt)
    instant: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  };

  // Animation triggers
  animateStats = false;
  animateFeatures = false;
  animateSteps = false;
  navbarState = 'transparent';
  currentImageIndex: number = 0;
  isTransitioning: boolean = false;
  lastDirection: string = 'next';
  autoRotateInterval: any;
  // Subscription management
  private alive = true;
  private imageRotationSubscription?: Subscription;
  private scrollSubscription?: Subscription;
  private testimonialInterval?: Subscription;

  // Feature images
  featureImages: string[] = [
    'assets/features/image1.png',
    'assets/features/image2.png',
    'assets/features/image3.png',
    'assets/features/image4.png',
  ];

  // Testimonials
  testimonials: Testimonial[] = [
    {
      name: 'Rohit Mehra',
      position: 'Head of Talent Acquisition',
      company: 'RETL Pvt. Ltd.',
      quote:
        "HiYrNow has completely streamlined our hiring workflow. We've seen a 50% reduction in hiring time with more relevant candidate matches.",
      avatar: '../../../assets/images/testimonials/rohit.jpg',
      rating: 5,
    },
    {
      name: 'Ankita Sharma',
      position: 'HR Manager',
      company: 'Dwiggly',
      quote:
        'The AI integration in HiYrNow helps us find quality candidates faster than ever. It’s like having a virtual hiring assistant 24/7.',
      avatar: '../../../assets/images/testimonials/ankita.jpg',
      rating: 5,
    },
    {
      name: 'Nikhil ',
      position: 'Director, CEO',
      company: 'Clusterzap.AI',
      quote:
        'From automation to intelligent matching, HiYrNow is redefining the way Indian companies hire. Our candidate engagement has skyrocketed.',
      avatar: '../../../assets/images/testimonials/karan.jpg',
      rating: 5,
    },
  ];

  // Hiring process steps
  steps: Step[] = [
    {
      id: 1,
      title: 'Job Posting',
      icon: 'description',
      description: 'Create and publish job listings across multiple platforms',
      automated: true,
      visible: false,
      strikeState: 'inactive',
      badgeState: 'hidden',
    },
    {
      id: 2,
      title: 'Resume Collection',
      icon: 'inbox',
      description: 'Gather applications from various sources',
      automated: true,
      visible: false,
      strikeState: 'inactive',
      badgeState: 'hidden',
    },
    {
      id: 3,
      title: 'Initial Screening',
      icon: 'filter_list',
      description: 'Sort through resumes to find qualified candidates',
      automated: true,
      visible: false,
      strikeState: 'inactive',
      badgeState: 'hidden',
    },
    {
      id: 4,
      title: 'Candidate Shortlisting',
      icon: 'checklist',
      description: 'Create a refined list of potential candidates',
      automated: true,
      visible: false,
      strikeState: 'inactive',
      badgeState: 'hidden',
    },
    {
      id: 5,
      title: 'Scheduling Interviews',
      icon: 'event',
      description: 'Coordinate times between candidates and hiring managers',
      automated: true,
      visible: false,
      strikeState: 'inactive',
      badgeState: 'hidden',
    },
    {
      id: 6,
      title: 'Conducting Interviews',
      icon: 'people',
      description: 'Speak with candidates to evaluate fit',
      automated: false,
      visible: false,
      strikeState: 'inactive',
      badgeState: 'hidden',
    },
    {
      id: 7,
      title: 'Decision Making',
      icon: 'psychology',
      description: 'Select the best candidate from the pool',
      automated: false,
      visible: false,
      strikeState: 'inactive',
      badgeState: 'hidden',
    },
    {
      id: 8,
      title: 'Onboarding',
      icon: 'rocket_launch',
      description: 'Welcome and integrate the new hire',
      automated: false,
      visible: false,
      strikeState: 'inactive',
      badgeState: 'hidden',
    },
  ];

  // Stats with counter animation properties
  stats: Stat[] = [
    {
      value: '50%',
      label: 'Reduction in screening time',
      icon: 'clock',
      counterValue: 0,
      targetValue: 50,
      suffix: '%',
    },
    {
      value: '40%',
      label: 'Faster hiring turnaround',
      icon: 'calendar',
      counterValue: 0,
      targetValue: 40,
      suffix: '%',
    },
    {
      value: '3x',
      label: 'Increase in candidate engagement',
      icon: 'users',
      counterValue: 0,
      targetValue: 3,
      suffix: 'x',
    },
    {
      value: '35%',
      label: 'Lower hiring costs',
      icon: 'dollar-sign',
      counterValue: 0,
      targetValue: 35,
      suffix: '%',
    },
  ];

  // Features
  features: Feature[] = [
    {
      title: 'Smart, AI-Powered Matching',
      description:
        'Our AI goes beyond resumes—analyzing behavior, skills, and goals to find the best-fit candidates for your role and company culture.',
      icon: 'cpu',
      state: 'normal',
    },
    {
      title: 'Pre-Validated Interest',
      description:
        'Every candidate is pre-screened for genuine interest, eliminating ghosting and ensuring higher engagement rates.',
      icon: 'shield-check',
      state: 'normal',
    },
    {
      title: 'Inclusive & Diverse Talent Pools',
      description:
        'Access a wide and diverse talent network using bias-minimizing algorithms that help build stronger, more inclusive teams.',
      icon: 'users',
      state: 'normal',
    },
    {
      title: 'Instant Credential Verification',
      description:
        'We verify experience, education, and certifications up front, so you only see fully vetted, interview-ready candidates.',
      icon: 'clock',
      state: 'normal',
    },
    {
      title: 'Faster Hiring, Less Stress',
      description:
        'Cut your time-to-hire by up to 80%. Our platform handles the heavy lifting so your team can focus on decision-making.',
      icon: 'zap',
      state: 'normal',
    },
    {
      title: 'Built for Modern Recruiters',
      description:
        'With ATS integration, collaboration tools, and real-time analytics, HiYrNow empowers teams to hire smarter and faster.',
      icon: 'layout-dashboard',
      state: 'normal',
    },
  ];

  // Partner companies with logo animation
  partners: string[] = [
    'Purecode.AI',
    'Green Robotics',
    'Arting Digital',
    'Stack.AI',
    'Rashi Ecotourism',
    'Clusterzap.AI',
    'Dwiggly',
  ];

  // Candidate data with animated counters
  candidateData: CandidateData = {
    name: 'Jordan Taylor',
    match: 97,
    animatedMatch: 0,
    skills: [
      { name: 'React', level: 95, animatedLevel: 0 },
      { name: 'TypeScript', level: 90, animatedLevel: 0 },
      { name: 'UX Design', level: 85, animatedLevel: 0 },
      { name: 'Node.js', level: 88, animatedLevel: 0 },
    ],
    availability: '2 weeks',
    salary: '$125,000 - $140,000',
    education: 'MS Computer Science, Stanford',
    verified: true,
    interestLevel: 'Very High',
  };

  // Subject to track scroll position
  private scrollPosition = new BehaviorSubject<number>(0);

  constructor() {}

  ngOnInit(): void {
    this.initScrollTracking();
    this.initScrollObserver();
    this.startImageRotation();
    this.startModalTimer();
  }

  ngAfterViewInit(): void {
    this.initStepAnimations();
  }

  ngOnDestroy(): void {
    this.alive = false;
    this.imageRotationSubscription?.unsubscribe();
    this.scrollSubscription?.unsubscribe();
    this.testimonialInterval?.unsubscribe();
    if (this.modalTimer) {
      clearTimeout(this.modalTimer);
    }
  }

  private initScrollTracking(): void {
    this.scrollSubscription = fromEvent(window, 'scroll')
      .pipe(
        takeWhile(() => this.alive),
        throttleTime(10),
        debounceTime(20)
      )
      .subscribe(() => {
        const position = window.pageYOffset;
        this.scrollPosition.next(position);

        // Update navbar style based on scroll position
        this.navbarState = position > 50 ? 'solid' : 'transparent';
      });
  }

  private initStepAnimations(): void {
    // Stagger the animation of each step appearing
    this.steps.forEach((step, index) => {
      setTimeout(() => {
        step.visible = true;
        // If step is automated, trigger strike-through and badge animations
        if (step.automated) {
          setTimeout(() => {
            step.strikeState = 'active';
            step.badgeState = 'visible';
          }, 800);
        }
      }, index * 300);
    });
  }

  startImageRotation(): void {
    this.imageRotationSubscription = interval(5000)
      .pipe(takeWhile(() => this.alive))
      .subscribe(() => {
        this.currentImageIndex =
          (this.currentImageIndex + 1) % this.featureImages.length;
      });
  }

  getIconPath(iconName: IconName): string {
    return this.iconPaths[iconName] || '';
  }

  onStepHover(step: Step): void {
    // Add custom hover effects if needed
  }

  onFeatureHover(feature: Feature, isHovered: boolean): void {
    feature.state = isHovered ? 'hovered' : 'normal';
  }

  private initScrollObserver(): void {
    const options = {
      threshold: 0.25,
      rootMargin: '-100px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          this.currentSection = id;

          switch (id) {
            case 'stats':
              if (!this.statsVisible) {
                this.statsVisible = true;
                this.animateStatsCounters();
              }
              break;
            case 'features':
              this.featuresVisible = true;
              break;
            case 'process':
              if (!this.stepsVisible) {
                this.stepsVisible = true;
                this.initStepAnimations();
              }
              break;
            case 'demo':
              if (!this.demoVisible) {
                this.demoVisible = true;
                this.animateCandidateData();
              }
              break;
            case 'testimonials':
              this.testimonialsVisible = true;
              break;
          }
        }
      });
    }, options);

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });
  }

  animateStatsCounters(): void {
    // Animate each stat counter from 0 to target value
    this.stats.forEach((stat, index) => {
      const duration = 2000; // 2 seconds for animation
      const steps = 60; // 60 steps (30fps for 2 seconds)
      const increment = stat.targetValue! / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= stat.targetValue!) {
          stat.counterValue = stat.targetValue;
          clearInterval(timer);
        } else {
          stat.counterValue = Math.floor(current);
        }
      }, duration / steps);
    });
  }

  animateCandidateData(): void {
    // Animate match percentage
    const matchDuration = 1500;
    const matchSteps = 50;
    const matchIncrement = this.candidateData.match / matchSteps;
    let currentMatch = 0;

    const matchTimer = setInterval(() => {
      currentMatch += matchIncrement;
      if (currentMatch >= this.candidateData.match) {
        this.candidateData.animatedMatch = this.candidateData.match;
        clearInterval(matchTimer);
      } else {
        this.candidateData.animatedMatch = Math.floor(currentMatch);
      }
    }, matchDuration / matchSteps);

    // Animate skill levels
    this.candidateData.skills.forEach((skill, index) => {
      setTimeout(() => {
        const skillDuration = 1200;
        const skillSteps = 40;
        const skillIncrement = skill.level / skillSteps;
        let currentLevel = 0;

        const skillTimer = setInterval(() => {
          currentLevel += skillIncrement;
          if (currentLevel >= skill.level) {
            skill.animatedLevel = skill.level;
            clearInterval(skillTimer);
          } else {
            skill.animatedLevel = Math.floor(currentLevel);
          }
        }, skillDuration / skillSteps);
      }, index * 150); // Stagger the animations
    });
  }

  private applyParallaxEffect(e: MouseEvent): void {
    const heroSection = document.getElementById('hero');
    if (!heroSection) return;

    const width = heroSection.offsetWidth;
    const height = heroSection.offsetHeight;
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const xPos = (mouseX / width - 0.5) * 20;
    const yPos = (mouseY / height - 0.5) * 20;

    const heroImg = heroSection.querySelector('.hero-image') as HTMLElement;
    const heroContent = heroSection.querySelector(
      '.hero-content'
    ) as HTMLElement;

    if (heroImg) {
      heroImg.style.transform = `translate(${xPos * -1}px, ${yPos * -1}px)`;
    }

    if (heroContent) {
      heroContent.style.transform = `translate(${xPos * 0.5}px, ${
        yPos * 0.5
      }px)`;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    // Handle resize events if needed
  }

  toggleNav(): void {
    this.isNavOpen = !this.isNavOpen;
  }

  scrollTo(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      // Calculate offset for the sticky header
      const navbarHeight = document.querySelector('nav')?.offsetHeight || 0;
      const elementPosition =
        element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      this.isNavOpen = false;
    }
  }

  setButtonState(state: string): void {
    this.buttonState = state;
  }

  isActiveSection(section: string): boolean {
    return this.currentSection === section;
  }

  startAutoRotate(): void {
    this.clearAutoRotate();
    this.autoRotateInterval = setInterval(() => {
      this.nextImage();
    }, 5000);
  }

  clearAutoRotate(): void {
    if (this.autoRotateInterval) {
      clearInterval(this.autoRotateInterval);
    }
  }

  goToImage(index: number): void {
    // Determine direction for animation
    this.lastDirection = index > this.currentImageIndex ? 'next' : 'prev';

    // Trigger transition animation
    this.triggerTransition();

    // Update current index
    this.currentImageIndex = index;

    // Reset auto-rotation
    this.startAutoRotate();
  }

  nextImage(): void {
    this.lastDirection = 'next';
    this.triggerTransition();
    this.currentImageIndex =
      (this.currentImageIndex + 1) % this.featureImages.length;
    this.startAutoRotate();
  }

  prevImage(): void {
    this.lastDirection = 'prev';
    this.triggerTransition();
    this.currentImageIndex =
      this.currentImageIndex === 0
        ? this.featureImages.length - 1
        : this.currentImageIndex - 1;
    this.startAutoRotate();
  }

  triggerTransition(): void {
    // Set transitioning state to true to trigger animations
    this.isTransitioning = true;

    // Reset after animation completes
    setTimeout(() => {
      this.isTransitioning = false;
    }, 700);
  }

  getStartPosition(): string {
    return this.lastDirection === 'next'
      ? 'translateX(100%)'
      : 'translateX(-100%)';
  }

  private startModalTimer(): void {
    this.modalTimer = setTimeout(() => {
      this.showModal = true;
    }, 15000); // 15 seconds
  }

  closeModal(): void {
    this.showModal = false;
    if (this.modalTimer) {
      clearTimeout(this.modalTimer);
    }
  }
}
