import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';

@Component({ selector: 'app-admin-plans', templateUrl: './admin-plans.component.html', styleUrls: ['./admin-plans.component.css'] })
export class AdminPlansComponent implements OnInit {
  plans: any[] = [];
  editing: any = null;
  constructor(private admin: AdminService) {}
  ngOnInit(): void { this.load(); }
  load() { this.admin.getPlans().subscribe(res => this.plans = res); }
  startCreate() {
    this.editing = {
      code: '',
      name: '',
      price: 0,
      limits: { jobPosts: 0, aiJdCredits: 0, profileViews: 0 }
    };
  }
  edit(p: any) {
    this.editing = {
      ...p,
      limits: {
        ...(p?.limits || {}),
        jobPosts: (p?.limits && p.limits.jobPosts) != null ? p.limits.jobPosts : 0,
        aiJdCredits: (p?.limits && p.limits.aiJdCredits) != null ? p.limits.aiJdCredits : 0,
        profileViews: (p?.limits && p.limits.profileViews) != null ? p.limits.profileViews : 0,
      }
    };
  }
  cancel() { this.editing = null; }
  save() {
    if (!this.editing) return;
    const payload = { ...this.editing };
    if (payload._id) this.admin.updatePlan(payload._id, payload).subscribe(() => { this.editing = null; this.load(); });
    else this.admin.createPlan(payload).subscribe(() => { this.editing = null; this.load(); });
  }
}


