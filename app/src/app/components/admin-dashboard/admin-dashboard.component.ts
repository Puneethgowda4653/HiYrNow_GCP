import { Component, OnInit } from '@angular/core';
import { JobPostingService } from '../../services/job-posting.service';
import { FormsModule } from '@angular/forms'; // Only needed for module, not here

interface JobPosting {
  id?: number;
  title?: string;
  company?: string;
  location?: string;
  datePosted?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  jobPostings: JobPosting[] = [];

  // Filtering and sorting properties
  filterTitle: string = '';
  filterCompany: string = '';
  filterLocation: string = '';
  includeActiveOnly: string = '';
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private jobPostingService: JobPostingService) {}

  ngOnInit() {
    this.jobPostingService.getAllJobPostings().subscribe({
      next: (data: any) => {
        this.jobPostings = Array.isArray(data) ? data : data?.jobs || [];
      },
      error: (error) => {
        console.error('Error fetching job postings:', error);
      },
    });
  }

  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  filteredAndSortedJobs(): JobPosting[] {
    let jobs = this.jobPostings;
    // Filter
    if (this.filterTitle) {
      jobs = jobs.filter((job) =>
        job.title?.toLowerCase().includes(this.filterTitle.toLowerCase())
      );
    }
    if (this.filterCompany) {
      jobs = jobs.filter((job) =>
        job.company?.toLowerCase().includes(this.filterCompany.toLowerCase())
      );
    }
    if (this.filterLocation) {
      jobs = jobs.filter((job) =>
        job.location?.toLowerCase().includes(this.filterLocation.toLowerCase())
      );
    }
    if (this.includeActiveOnly) {
      jobs = jobs.filter((job) => job['status'] == 'Active'); // assumes 'active' property
    }
    // Sort
    if (this.sortField) {
      jobs = jobs.slice().sort((a, b) => {
        const aValue = (a as any)[this.sortField] || '';
        const bValue = (b as any)[this.sortField] || '';
        if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return jobs;
  }

  manageJobPosting(jobId: number) {
    // Placeholder for manage job posting logic
    alert('Manage Job Posting: ' + jobId);
  }
}
