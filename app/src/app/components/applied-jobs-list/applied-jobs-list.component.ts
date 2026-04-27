import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { JobPostingService } from '../../services/job-posting.service';
import { UserService } from '../../services/user.service';
import { finalize } from 'rxjs/operators';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

interface Interview {
  _id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  startDateTime: string;
}

interface Assignment {
  _id: string;
  status: 'sent' | 'submitted' | 'evaluated';
  title: string;
}

interface JobApplication {
  _id: string;
  status: 'applied' | 'shortlisted' | 'interviewing' | 'rejected' | 'accepted';
  title: string;
  company: string;
  location: string;
  dateApplied: string;
  updatedAt: string;
  jobSource: string;
  coverLetter: string;
  interviews: Interview[];
  assignment: Assignment;
  jobPosting: string;
  jobPostingDetails: any;
  comments: any[];
  isSaved?: boolean;
}

@Component({
  selector: 'app-applied-jobs-list',
  templateUrl: './applied-jobs-list.component.html',
  styleUrls: ['./applied-jobs-list.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(50, [
            animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class AppliedJobsListComponent implements OnInit {
  appliedJobs: JobApplication[] = [];
  savedJobs: JobApplication[] = [];
  isLoading = true;
  error: string | null = null;
  filterStatus = 'all';
  searchTerm = '';
  applicationID = '';
  activeTab: 'applied' | 'saved' = 'applied';
  sortBy: 'date' | 'status' | 'company' = 'date';
  viewMode: 'grid' | 'list' = 'grid';
  selectedJob: JobApplication | null = null;
  showDetailModal = false;

  constructor(
    private jobApplicationService: JobPostingService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserApplications();
  }

  private loadUserApplications(): void {
    this.isLoading = true;
    this.error = null;

    this.userService.findLoggedUser()
      .then(user => {
        if (user) {
          this.fetchAppliedJobs(user._id);
        } else {
          this.error = 'Please log in to view your applications';
        }
      })
      .catch(() => {
        this.error = 'Failed to load user data';
      });
  }

  private fetchAppliedJobs(userId: string): void {
    this.jobApplicationService.getAllJobsAppliedByUser(userId)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe(
        (jobs) => {
          this.appliedJobs = jobs.filter((job: JobApplication) => !job.isSaved);
          this.savedJobs = jobs.filter((job: JobApplication) => job.isSaved);
          this.sortApplications();
        },
        () => {
          this.error = 'Failed to load applications';
        }
      );
  }

  sortApplications(): void {
    const sortFn = this.getSortFunction();
    this.appliedJobs.sort(sortFn);
    this.savedJobs.sort(sortFn);
  }

  private getSortFunction() {
    switch(this.sortBy) {
      case 'date':
        return (a: JobApplication, b: JobApplication) => 
          new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime();
      case 'status':
        return (a: JobApplication, b: JobApplication) => a.status.localeCompare(b.status);
      case 'company':
        return (a: JobApplication, b: JobApplication) => a.company.localeCompare(b.company);
      default:
        return (a: JobApplication, b: JobApplication) => 
          new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime();
    }
  }

  getStatusColor(status: 'applied' | 'shortlisted' | 'interviewing' | 'accepted' | 'rejected'): string {
    const colors = {
      applied: 'status-applied',
      shortlisted: 'status-shortlisted',
      interviewing: 'status-interviewing',
      accepted: 'status-accepted',
      rejected: 'status-rejected'
    };
    return colors[status] || 'status-applied';
  }

  getFilteredJobs(): JobApplication[] {
    const jobs = this.activeTab === 'applied' ? this.appliedJobs : this.savedJobs;
    return jobs
      .filter(job => this.filterStatus === 'all' || job.status === this.filterStatus)
      .filter(job => 
        job.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getUpcomingInterview(interviews: Interview[]): Interview | null {
    if (!interviews?.length) return null;
    
    const futureInterviews = interviews
      .filter(interview => 
        interview.status === 'scheduled' && 
        new Date(interview.startDateTime) > new Date()
      )
      .sort((a, b) => 
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
      );

    return futureInterviews[0] || null;
  }

  formatInterviewDate(dateTime: string): string {
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getApplicationDuration(dateApplied: string): string {
    const days = Math.floor((new Date().getTime() - new Date(dateApplied).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }

  getInterviewingCount(): number {
    return this.appliedJobs.filter(job => job.status === 'interviewing').length;
  } 

  getShortlistedCount(): number {
    return this.appliedJobs.filter(job => job.status === 'shortlisted').length;
  }

  getAcceptedCount(): number {
    return this.appliedJobs.filter(job => job.status === 'accepted').length;
  }

  getRejectedCount(): number {
    return this.appliedJobs.filter(job => job.status === 'rejected').length;
  }

  refresh(): void {
    this.loadUserApplications();
  }

  switchTab(tab: 'applied' | 'saved'): void {
    this.activeTab = tab;
    this.filterStatus = 'all';
    this.searchTerm = '';
  }

  changeSortBy(sortBy: 'date' | 'status' | 'company'): void {
    this.sortBy = sortBy;
    this.sortApplications();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  viewJobDetails(applicationID: string): void {
    this.router.navigate(['/ApplicationDetails', applicationID]);
  }

  openDetailModal(job: JobApplication): void {
    this.selectedJob = job;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    setTimeout(() => this.selectedJob = null, 300);
  }

  getProgressPercentage(job: JobApplication): number {
    const statusOrder = ['applied', 'shortlisted', 'interviewing', 'accepted'];
    const index = statusOrder.indexOf(job.status);
    return index >= 0 ? ((index + 1) / statusOrder.length) * 100 : 0;
  }

  startMockInterview(): void {
    // Navigate to mock interview page or open mock interview modal
    this.router.navigate(['/mock-interview']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/user-profile']);
  }

  navigateToJobs(): void {
    this.router.navigate(['/job-list']);
  }
}
