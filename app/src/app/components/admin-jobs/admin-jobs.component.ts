import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-jobs',
  templateUrl: './admin-jobs.component.html',
  styleUrls: ['./admin-jobs.component.css']
})
export class AdminJobsComponent implements OnInit {
  loading = false;
  jobs: any[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  filters: any = { company: '', title: '', status: '', location: '' };

  constructor(private admin: AdminService) {}
  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.admin.getJobs({ ...this.filters, page: this.page, pageSize: this.pageSize }).subscribe({
      next: (res) => { this.jobs = res.items; this.total = res.total; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  setStatus(j: any, status: string) {
    this.admin.updateJobStatus(j._id, status).subscribe(() => this.load());
  }
}


