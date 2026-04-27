// plan-usage.component.ts
import { Component, OnInit } from '@angular/core';
import { RecruiterDetailService } from '../../services/recruiter-detail.service';
import { PlanService, PricingPlan } from '../../services/plan.service';
import { firstValueFrom } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface UsageRow {
  key: string;
  label: string;
  used: number;
  limit: number; // Infinity for unlimited
}

@Component({
  selector: 'app-plan-usage',
  templateUrl: './plan-usage.component.html',
  styleUrls: ['./plan-usage.component.css']
})
export class PlanUsageComponent implements OnInit {
  loading = true;
  error: string | null = null;
  plan: PricingPlan | null = null;
  planLabel = '';
  usageRows: UsageRow[] = [];
  renewsOn: string = '';
  hoveredFeature: string | null = null;
  planEndDate: Date | null = null;

  // Icon SVGs for different features
  private readonly featureIcons: { [key: string]: string } = {
    0: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />',
    1: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />',
    2: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />',
    3: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />',
    4: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />'
  };

  private readonly featureDescriptions: { [key: number]: string } = {
    0: 'Create and manage job listings',
    1: 'AI-powered job description creation',
    2: 'Intelligent candidate screening',
    3: 'Access to candidate profiles',
    4: 'Boost visibility of your jobs'
  };

  constructor(
    private recruiterSvc: RecruiterDetailService,
    private planSvc: PlanService,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit() {
    try {
      const recruiter: any = await this.recruiterSvc.findRecruiterDetailsByUserId();
      if (!recruiter) {
        this.error = 'Recruiter profile not found';
        this.loading = false;
        return;
      }

      const codeGuess: string | undefined = recruiter.isCustomPlan ? 'enterprise' : undefined;
      
      if (recruiter.plan) {
        const plans = await firstValueFrom(this.planSvc.getPlans());
        const matched = (plans || []).find(p => String(p._id) === String(recruiter.plan));
        this.plan = matched || null;
      } else if (codeGuess) {
        this.plan = await firstValueFrom(this.planSvc.getPlan(codeGuess));
      }
      
      if (!this.plan) {
        this.plan = await firstValueFrom(this.planSvc.getPlan('starter'));
      }

      this.planLabel = `${this.plan?.name || 'Starter'}${recruiter.billingCycle ? ' · ' + recruiter.billingCycle : ''}`;
      
      if (recruiter.planEndDate) {
        this.planEndDate = new Date(recruiter.planEndDate);
        this.renewsOn = this.planEndDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }

      // Build usage rows
      const u = recruiter.usage || {};
      this.usageRows = [
        this.makeRow('Job Posting', 'Job Postings', u.jobPostsThisCycle || 0),
        this.makeRow('AI JD Generator', 'AI JD Generator', u.aiJdThisCycle || 0),
        this.makeRow('AI Profile Analysis', 'AI Profile Analysis', u.aiProfileAnalysisThisCycle || 0),
        this.makeRow('Candidate Database', 'Candidate Profiles', u.candidateProfileCredits || 0),
        this.makeRow('Job Boost', 'Job Boost', u.jobBoostsThisCycle || 0)
      ].filter(r => r.limit !== 0);

    } catch (e: any) {
      this.error = e?.message || 'Failed to load usage data';
    } finally {
      this.loading = false;
    }
  }

  private makeRow(featureKey: string, label: string, used: number): UsageRow {
    const limit = this.parseLimit(this.plan?.features?.[featureKey]);
    return { key: featureKey, label, used, limit };
  }

  private parseLimit(value: string | undefined): number {
  if (!value) return 0;
  const v = String(value).toLowerCase().trim();
  if (v.includes('unlimited') || v.includes('custom')) return Infinity;

  // Extract first numeric value only
  const match = v.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    return isNaN(num) ? 0 : num;
  }

  return 0;
}


 pct(row: UsageRow): number {
  if (!row || row.limit === Infinity) return 0;
  const used = Number(row.used) || 0;
  const limit = Number(row.limit) || 1;
  const pct = Math.round((used / limit) * 100);
  return Math.max(0, Math.min(100, pct));
}


  isNearLimit(row: UsageRow): boolean {
    if (row.limit === Infinity) return false;
    return this.pct(row) >= 80;
  }

  getUsedFeaturesCount(): number {
    return this.usageRows.filter(row => row.used > 0).length;
  }

  getAverageUsage(): number {
    const finiteRows = this.usageRows.filter(row => row.limit !== Infinity);
    if (finiteRows.length === 0) return 0;
    
    const totalPct = finiteRows.reduce((sum, row) => sum + this.pct(row), 0);
    return Math.round(totalPct / finiteRows.length);
  }

  getDaysRemaining(): number {
    if (!this.planEndDate) return 0;
    const today = new Date();
    const diffTime = this.planEndDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  shouldShowUpgradeBanner(): boolean {
    // Show upgrade banner if any feature is near limit or average usage is high
    const hasNearLimitFeature = this.usageRows.some(row => this.isNearLimit(row));
    const highAverageUsage = this.getAverageUsage() >= 70;
    return hasNearLimitFeature || highAverageUsage;
  }

  getIcon(index: number): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.featureIcons[index] || this.featureIcons[0]);
  }

  getFeatureDescription(index: number): string {
    return this.featureDescriptions[index] || '';
  }
}