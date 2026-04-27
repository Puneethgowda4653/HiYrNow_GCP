import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';

@Component({ selector: 'app-admin-analytics', templateUrl: './admin-analytics.component.html', styleUrls: ['./admin-analytics.component.css'] })
export class AdminAnalyticsComponent implements OnInit {
  summary: any;
  ai: any;
  loading = false;
  constructor(private admin: AdminService) {}
  ngOnInit(): void { this.refresh(); }
  refresh() {
    this.loading = true;
    this.admin.getSummary().subscribe(s => { this.summary = s; });
    this.admin.getAIAnalytics().subscribe(a => { this.ai = a; this.loading = false; });
  }
}


