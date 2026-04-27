import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { JobPostingModelClient } from '../../models/job-posting.model.client';
import { JobListingService } from '../../services/job-listing.service';
import { JobPostingService } from '../../services/job-posting.service';
import { SaveJobService } from '../../services/save-job.service';
import { UserService } from '../../services/user.service';
import { RecruiterDetailService } from '../../services/recruiter-detail.service';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { fadeIn, fadeInUp, listAnimation } from '../../shared/animations';

interface SortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-companay-job-list',
  templateUrl: './companay-job-list.component.html',
  styleUrls: ['./companay-job-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeIn, fadeInUp, listAnimation]
})
export class CompanayJobListComponent implements OnInit {
  private jobPostingsSubject = new BehaviorSubject<JobPostingModelClient[]>([]);
  
  // Made public for template access
  filterSubject = new BehaviorSubject<any>({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minApplications: null,
  });

  sortSubject = new BehaviorSubject<any>({
    column: 'datePosted',
    direction: 'asc',
  });
  // PVC modal properties
  showPVCModal = false;
  selectedJob: any = null;
  selectedPVCCount: number = 0; // Default selection
  totalPoints: number = 0; // Default (3 * 2)
  userPoints: number = 20; // Will be fetched from user service

  jobPostings$ = this.jobPostingsSubject.asObservable();
  filters$ = this.filterSubject.asObservable();
  sort$ = this.sortSubject.asObservable();

  filteredAndSortedJobs$!: Observable<JobPostingModelClient[]>;
  paginatedJobs$!: Observable<JobPostingModelClient[]>;
  totalFilteredJobs$!: Observable<number>;
  isSubmiting: boolean = false;
  selectedStatus: string = ''; // For toggle buttons

  getProgressWidth(job: JobPostingModelClient): string {
    const jobs = this.jobPostingsSubject.getValue();
    const maxApplications = Math.max(...jobs.map(j => j.totalApplications || 0), 1);
    return ((job.totalApplications || 0) / maxApplications * 100) + '%';
  }
  isLoading = false;
  jobToDelete: JobPostingModelClient | null = null;
  stats = {
    totalJobs: 0,
    activeJobs: 0,
    jobapplicants: 0,
    averageResponseTime: 0,
  };

  pageSize = 5;
  currentPage = 1;
  currentPageSubject = new BehaviorSubject<number>(1);
  jobapplicants: number = 0;

  // Sort options for the UI
  sortOptions: SortOption[] = [
    { label: 'Date Posted', value: 'datePosted' },
    { label: 'Applications', value: 'totalApplications' },
    { label: 'Title', value: 'title' },
  ];

  // Mapped sort options for template
  get sortOptionsMapped() {
    return this.sortOptions.map(opt => ({ label: opt.label, value: opt.value }));
  }

  constructor(
    private jobPostService: JobPostingService,
    private saveJobService: SaveJobService,
    private userService: UserService,
    private recruiterService: RecruiterDetailService,
    private http: HttpClient,
    private router: Router
  ) {
    this.setupFilteredJobs();
  }

  private setupFilteredJobs() {
    this.filteredAndSortedJobs$ = combineLatest([
      this.jobPostings$,
      this.filters$.pipe(debounceTime(300), distinctUntilChanged()),
      this.sort$,
    ]).pipe(
      map(([jobs, filters, sort]) => {
        // Filter jobs
        let filtered = jobs.filter((job) => {
          const searchMatch =
            !filters.search ||
            job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            job.company.toLowerCase().includes(filters.search.toLowerCase()) ||
            (job.description &&
              job.description
                .toLowerCase()
                .includes(filters.search.toLowerCase()));

          const statusMatch = !filters.status || job.status?.toLowerCase() === filters.status.toLowerCase();

          const dateMatch =
            !filters.dateFrom ||
            !filters.dateTo ||
            (new Date(job.datePosted) >= new Date(filters.dateFrom) &&
              new Date(job.datePosted) <= new Date(filters.dateTo));

          const applicationsMatch =
            !filters.minApplications ||
            (job.totalApplications || 0) >= filters.minApplications;

          return searchMatch && statusMatch && dateMatch && applicationsMatch;
        });

        // Sort jobs
        filtered.sort((a, b) => {
          const direction = sort.direction === 'asc' ? 1 : -1;

          if (sort.column === 'datePosted') {
            return (
              direction *
              (new Date(b.datePosted).getTime() -
                new Date(a.datePosted).getTime())
            );
          }

          if (sort.column === 'totalApplications') {
            return (
              direction *
              ((b.totalApplications || 0) - (a.totalApplications || 0))
            );
          }

          // Default to string comparison for other fields
          const aValue = String(
            a[sort.column as keyof JobPostingModelClient] || ''
          );
          const bValue = String(
            b[sort.column as keyof JobPostingModelClient] || ''
          );
          return direction * aValue.localeCompare(bValue);
        });

        return filtered;
      })
    );

    // Total filtered jobs count
    this.totalFilteredJobs$ = this.filteredAndSortedJobs$.pipe(
      map(jobs => jobs.length)
    );

    // Paginated jobs
    this.paginatedJobs$ = combineLatest([
      this.filteredAndSortedJobs$,
      this.currentPageSubject
    ]).pipe(
      map(([jobs, page]) => {
        const start = (page - 1) * this.pageSize;
        const end = start + this.pageSize;
        return jobs.slice(start, end);
      })
    );
  }

  selectStatus(status: string) {
    this.selectedStatus = status;
    const currentFilters = this.filterSubject.getValue();
    this.filterSubject.next({
      ...currentFilters,
      status: status
    });
    this.currentPage = 1; // Reset to first page when filtering
    this.currentPageSubject.next(1);
  }

  getTotalPages(): Observable<number> {
    return this.totalFilteredJobs$.pipe(
      map(total => Math.ceil(total / this.pageSize))
    );
  }

  ngOnInit() {
    this.loadJobs();
  }
  openPVCRequestModal(job: any) {
    this.selectedJob = job;
    this.selectedPVCCount = 3; // Reset to default
    this.calculatePVCCost(); // Calculate initial points
    this.showPVCModal = true;
  }

  closePVCModal(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showPVCModal = false;
    this.selectedJob = null;
  }

  submitPVCRequest() {
    // Check if user has enough points
    if (this.userPoints < this.totalPoints) {
      return; // Don't proceed if not enough points
    }

    // Show loader
    this.isSubmiting = true;

    const payload = {
      jobId: this.selectedJob._id,
      // userId: this.userService.findLoggedUser(),
      pvcCount: this.selectedPVCCount,
      pointsDeducted: this.totalPoints,
    };

    this.jobPostService.submitPvcRequest(payload).subscribe({
      next: (response) => {
        // Update local user points immediately for better UX
        this.userPoints -= this.totalPoints;

        // Show success message or notification
        // this.jobService.showNotification('PVC request submitted successfully!', 'success');
        alert('PVC Request Sent');
      },
      error: (error) => {
        console.error('Error submitting PVC request:', error);
        // this.jobService.showNotification('Failed to submit request. Please try again.', 'error');

        // Hide loader
        this.isSubmiting = false;

        // Optional: Show error alert
        alert('Failed to submit request');
      },
    });

    // Close modal and hide loader
    this.showPVCModal = false;
    this.selectedJob = null;
    this.isSubmiting = false;
  }

  // Add getCurrentDate method
  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async loadJobs() {
    this.isLoading = true;
    try {
      const jobs = await this.jobPostService.getAllJobPostingForUser();

      let totalApplications = 0;

      // Process jobs and calculate application counts
      for (const job of jobs) {
        if (!job.status) job.status = 'Active';

        // Assign total applications for the job
        job.totalApplications = job.applicationDetails?.totalApplications || 0;

        // Accumulate total applications across all jobs
        totalApplications += job.totalApplications;
      }

      // Assign the total sum after iterating
      this.jobapplicants = totalApplications;

      this.jobPostingsSubject.next(jobs);
      this.updateStats(jobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private updateStats(jobs: JobPostingModelClient[]) {
    this.stats = {
      totalJobs: jobs.length,
      // REPLACE WITH:
      activeJobs: jobs.filter((j) => j.status?.toLowerCase() === 'active').length,
      jobapplicants: this.jobapplicants,
      averageResponseTime: 2.3, // This could be calculated based on actual response time data
    };
  }

  async toggleJobStatus(job: JobPostingModelClient) {
    this.isLoading = true;
    try {
      const newStatus = job.status === 'Active' ? 'Inactive' : 'Active';
      await this.jobPostService.updateJobPosting(job._id, {
        status: newStatus,
      });

      // Update local data
      const currentJobs = this.jobPostingsSubject.value;
      const updatedJobs = currentJobs.map((j) => {
        if (j._id === job._id) {
          return { ...j, status: newStatus };
        }
        return j;
      });

      this.jobPostingsSubject.next(updatedJobs);
      this.updateStats(updatedJobs);
    } catch (error) {
      console.error('Error updating job status:', error);
    } finally {
      this.isLoading = false;
    }
  }

  openDeleteConfirmation(job: JobPostingModelClient) {
    this.jobToDelete = job;
  }

  cancelDelete() {
    this.jobToDelete = null;
  }

  async confirmDelete() {
    if (!this.jobToDelete) return;

    const jobId = this.jobToDelete._id;
    this.isLoading = true;

    try {
      await this.jobPostService.deleteJobPosting(jobId);
      await this.saveJobService.deleteJobApplicationByJobPosting(
        jobId,
        'job-portal'
      );

      const updatedJobs = this.jobPostingsSubject.value.filter(
        (job) => job._id !== jobId
      );
      this.jobPostingsSubject.next(updatedJobs);
      this.updateStats(updatedJobs);
    } catch (error) {
      console.error('Error deleting job:', error);
    } finally {
      this.isLoading = false;
      this.jobToDelete = null;
    }
  }

  updateFilter(filterUpdate: Partial<any>) {
    this.filterSubject.next({
      ...this.filterSubject.value,
      ...filterUpdate,
    });
  }

  resetFilters() {
    this.filterSubject.next({
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      minApplications: null,
    });
  }

  updateSort(column: string) {
    const currentSort = this.sortSubject.value;
    this.sortSubject.next({
      column,
      direction:
        currentSort.column === column && currentSort.direction === 'asc'
          ? 'desc'
          : 'asc',
    });
  }

  loadMore() {
    this.currentPage++;
  }

  // Navigation methods
  editJob(job: JobPostingModelClient) {
    // Navigate to edit job page
    this.router.navigate(['/edit-job', job._id]);
  }

  viewAnalytics(job: JobPostingModelClient) {
    // Navigate to job management with analytics focus
    this.router.navigate(['/job/manage', job._id], { fragment: 'analytics' });
  }

  duplicateJob(job: JobPostingModelClient) {
    // Implementation for duplicating a job
    console.log('Duplicating job:', job._id);
    // Could navigate to new-job with job data prefilled
    this.router.navigate(['/new-job'], { state: { duplicateJob: job } });
  }

  // Helper method to get time ago
  getTimeAgo(date: string | Date): string {
    if (!date) return 'N/A';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  }

  // TrackBy function for performance
  trackByJobId(index: number, job: JobPostingModelClient): string {
    return job._id;
  }

  // Normalize status to lowercase for consistent comparison
  getNormalizedStatus(status: string | undefined): string {
    if (!status) return 'active';
    return status.toLowerCase();
  }

  // Update job status
  updateJobStatus(job: JobPostingModelClient, event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newStatus = selectElement.value;
    
    // Normalize current status for comparison
    const currentStatus = this.getNormalizedStatus(job.status);
    
    if (!job._id || currentStatus === newStatus) {
      return;
    }

    // Optimistically update the UI
    const currentJobs = this.jobPostingsSubject.getValue();
    const updatedJobs = currentJobs.map(j => 
      j._id === job._id ? { ...j, status: newStatus as any } : j
    );
    this.jobPostingsSubject.next(updatedJobs);

    // Update via API
    this.jobPostService.updateJobPosting(job._id, { status: newStatus })
      .then(() => {
        // Success - already updated in UI
        console.log(`Job status updated to ${newStatus}`);
      })
      .catch((error) => {
        console.error('Error updating job status:', error);
        // Revert on error
        this.jobPostingsSubject.next(currentJobs);
        alert('Failed to update job status. Please try again.');
      });
  }

  // Pagination helpers
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.currentPageSubject.next(this.currentPage);
    }
  }

  nextPage(): void {
    this.currentPage++;
    this.currentPageSubject.next(this.currentPage);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.currentPageSubject.next(this.currentPage);
  }

  getPaginationPages(): number[] {
    // Get total filtered jobs count synchronously
    let totalJobs = 0;
    this.totalFilteredJobs$.pipe(
      map(count => {
        totalJobs = count;
        return count;
      })
    ).subscribe().unsubscribe();
    
    const totalPages = Math.ceil(totalJobs / this.pageSize) || 1;
    const pages: number[] = [];
    const maxPages = 5;
    
    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(totalPages, start + maxPages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  // PVC Modal Methods - Updated to avoid duplicates
  calculatePVCCost(): void {
    // Assuming cost is 2 points per PVC
    this.totalPoints = this.selectedPVCCount * 2;
  }

  confirmPVCPurchase(): void {
    if (this.totalPoints <= this.userPoints && this.selectedJob) {
      console.log(`Promoting job ${this.selectedJob._id} with ${this.selectedPVCCount} PVCs`);
      // Implement the actual PVC purchase logic here
      this.showPVCModal = false;
      this.selectedJob = null;
    }
  }

  // Apply filters
  applyFilters(): void {
    this.filterSubject.next(this.filterSubject.value);
  }

  // Apply sort
  applySort(): void {
    this.sortSubject.next(this.sortSubject.value);
  }

  // Helper methods for template
  getDisplayEnd(totalJobs: number): number {
    return Math.min(this.currentPage * this.pageSize, totalJobs);
  }

  getDisplayStart(): number {
    return ((this.currentPage - 1) * this.pageSize) + 1;
  }
}
