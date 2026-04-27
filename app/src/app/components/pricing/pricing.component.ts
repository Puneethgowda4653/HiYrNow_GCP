import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PlanService, PricingPlan, UserPlanStatus } from '../../services/plan.service';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { SubscribeModalComponent } from '../subscribe-modal/subscribe-modal.component';
import { CustomPlanModalComponent } from '../custom-plan-modal/custom-plan-modal.component';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('800ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerCards', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(40px) scale(0.95)' }),
          stagger(100, [
            animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', 
              style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('400ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('400ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class PricingComponent implements OnInit, OnDestroy {
  plans: PricingPlan[] = [];
  showFullComparison = false;
  billingCycle: 'monthly' | 'yearly' = 'monthly';
  isLoggedIn = false;
  userPlanStatus: UserPlanStatus | null = null;
  isLoading = true;
  
  private destroy$ = new Subject<void>();

  // Feature comparison data
  comparisonFeatures = [
    { key: 'Job Postings', prop: 'jobPostings' },
    { key: 'AI-Powered Matching', prop: 'aiMatching' },
    { key: 'Resume Parsing Credits', prop: 'resumeParsing' },
    { key: 'Candidate Database Access', prop: 'candidateAccess' },
    { key: 'Advanced Analytics', prop: 'analytics' },
    { key: 'Team Collaboration', prop: 'teamSize' },
    { key: 'Priority Support', prop: 'support' },
    { key: 'Custom Branding', prop: 'branding' },
    { key: 'API Access', prop: 'apiAccess' },
    { key: 'Dedicated Account Manager', prop: 'accountManager' }
  ];

  constructor(
    private router: Router,
    private planService: PlanService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadPlans();
    this.checkUserStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

 loadPlans(): void {
  this.planService.getPlans()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (plans) => {
        const hiddenPlanCodes = ['earlybird'];
        const order = ['starter', 'growth', 'elite', 'enterprise'];
        this.plans = plans
          .filter(plan => !hiddenPlanCodes.includes(plan.code))
          .sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code))
          .map(plan => ({
            ...plan,
            isPopular: plan.code === 'growth' // Mark Growth as most popular
          }));
        
        this.isLoading = false;
        console.log('--- Loaded Plans ---', this.plans); // ✅ Move inside here
      },
      error: (err) => {
        console.error('Failed to load plans:', err);
        this.isLoading = false;
      }
    });
}

  checkUserStatus(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    if (this.isLoggedIn) {
      // this.loadUserPlanStatus();
    }
  }

  // loadUserPlanStatus(): void {
  //   this.planService.getUserPlanStatus()
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: (status: UserPlanStatus) => {
  //         this.userPlanStatus = status;
  //       },
  //       error: (err: Error) => console.error('Failed to load user plan status:', err)
  //     });
  // }

  openCustomPlanModal(): void {
    this.dialog.open(CustomPlanModalComponent, {
      width: '600px',
      panelClass: 'custom-dialog-container'
    });
  }

  getPrice(plan: PricingPlan): number {
    return this.billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  }

  getSavingsPercentage(plan: PricingPlan): number {
    if (plan.monthlyPrice === 0) return 0;
    const yearlyMonthly = plan.yearlyPrice / 12;
    return Math.round(((plan.monthlyPrice - yearlyMonthly) / plan.monthlyPrice) * 100);
  }

  formatPrice(price: number): string {
    return '₹' + price.toLocaleString('en-IN');
  }

  toggleBillingCycle(): void {
    this.billingCycle = this.billingCycle === 'monthly' ? 'yearly' : 'monthly';
  }

  getUsagePercentage(used: number, limit: number): number {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  }

  getUsageColor(percentage: number): string {
    if (percentage < 50) return '#10b981'; // green
    if (percentage < 80) return '#f59e0b'; // amber
    return '#ef4444'; // red
  }

  subscribe(plan: PricingPlan): void {
    if (plan.code === 'enterprise') {
      this.openCustomPlanModal();
      return;
    }

    const dialogRef = this.dialog.open(SubscribeModalComponent, {
      width: '520px',
      maxWidth: '95vw',
      panelClass: ['rounded-2xl', 'shadow-2xl'],
      data: { 
        plan,
        billingCycle: this.billingCycle,
        currentPlan: this.userPlanStatus?.currentPlan
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result?.success) {
          // this.loadUserPlanStatus();
          // Show success notification
        }
      });
  }

  // openCustomPlanModal(): void {
  //   this.dialog.open(CustomPlanModalComponent, {
  //     width: '600px',
  //     maxWidth: '95vw',
  //     panelClass: ['rounded-2xl', 'shadow-2xl']
  //   });
  // }

  upgradePlan(): void {
    // Navigate to pricing with upgrade intent
    const currentPlanIndex = this.plans.findIndex(
      p => p.code === this.userPlanStatus?.currentPlan
    );
    if (currentPlanIndex < this.plans.length - 1) {
      const nextPlan = this.plans[currentPlanIndex + 1];
      this.subscribe(nextPlan);
    }
  }

  downgradePlan(): void {
    // Show downgrade confirmation and process
    const currentPlanIndex = this.plans.findIndex(
      p => p.code === this.userPlanStatus?.currentPlan
    );
    if (currentPlanIndex > 0) {
      const prevPlan = this.plans[currentPlanIndex - 1];
      this.subscribe(prevPlan);
    }
  }

  scrollToComparison(): void {
    this.showFullComparison = true;
    setTimeout(() => {
      document.getElementById('comparison-table')?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  }

  getFeatureValue(plan: PricingPlan, prop: string): string {
    return plan.features[prop] || '—';
  }

  isPlanActive(plan: PricingPlan): boolean {
    return this.userPlanStatus?.currentPlan === plan.code;
  }

  canSelectPlan(plan: PricingPlan): boolean {
    if (!this.isLoggedIn) return true;
    return !this.isPlanActive(plan);
  }

  getCtaText(plan: PricingPlan): string {
    if (plan.code === 'enterprise') return 'Contact Sales';
    if (this.isPlanActive(plan)) return 'Current Plan';
    if (plan.code === 'starter') return 'Get Started Free';
    return this.billingCycle === 'monthly' ? 'Subscribe Monthly' : 'Subscribe Yearly';
  }
}