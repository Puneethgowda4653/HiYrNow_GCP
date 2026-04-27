import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { JobPostingModelClient } from '../../models/job-posting.model.client';
import { JobPostingService } from '../../services/job-posting.service';
import { FilterService } from '../../services/filter.service';
import { UserService } from '../../services/user.service';

// Interface for saved filters
interface SavedFilter {
  id: string;
  name: string;
  searchParams: any;
  selectedFilters: any;
  createdAt: Date;
}

@Component({
  selector: 'app-job-list',
  templateUrl: './job-list.component.html',
  styleUrls: ['./job-list.component.css'],
})
export class JobListComponent implements OnInit, OnDestroy {
  private searchSubject = new Subject<void>();
  activeTab: 'all-jobs' | 'recommended' = 'all-jobs';
  screenWidth: number = window.innerWidth;

  searchParams = {
    keyword: '',
    location: '',
    sortBy: 'newest' as 'newest' | 'relevant',
  };

  filterOptions = {
    jobTypes: ['Full Time', 'Part Time', 'Contract', 'Internship'],
    experienceLevels: ['Entry Level', '1-3 years', '3-5 years', '5+ years'],
    salaryRanges: ['0-30k', '30k-60k', '60k-90k', '90k+'],
    remoteOptions: ['Remote', 'Hybrid', 'On-site'],
  };

  selectedFilters = {
    jobTypes: [] as string[],
    experienceLevels: [] as string[],
    salaryRanges: [] as string[],
    remoteOptions: [] as string[],
  };

  state = {
    jobs: [] as JobPostingModelClient[],
    filteredJobs: [] as JobPostingModelClient[],
    recommendedJobs: [] as JobPostingModelClient[],
    isFiltered: false,
    isMobileSidebarOpen: false,
    isLoading: false,
    error: null as string | null,
    totalJobs: 0,
    currentPage: 1,
    jobsPerPage: 10,
    savedFilters: [] as SavedFilter[],
    showSaveFilterModal: false,
    currentFilterName: '',
  };
  user: any;
  userID: any;

  constructor(
    private jobPostService: JobPostingService,
    private filterService: FilterService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.setupSearchDebounce();
  }

  // Add Math to component for template usage
  get Math() {
    return Math;
  }

  setActiveTab(tab: 'all-jobs' | 'recommended') {
    this.activeTab = tab;
    if (tab === 'recommended') {
      this.state.filteredJobs = this.state.recommendedJobs;
    } else {
      this.fetchJobs();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.state.isMobileSidebarOpen) {
      this.toggleMobileSidebar();
    }
  }

  private setupSearchDebounce() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.filterJobs();
      });
  }

  ngOnInit() {
    this.initializeComponent();
    this.sessionCheck();
  }

  ngOnDestroy() {
    // Clean up body class when component is destroyed
    document.body.classList.remove('sidebar-open');
  }

  sessionCheck(): void {
    this.userService.findLoggedUser().then((user) => {
      this.user = user;
      this.loadFiltersFromStorage();
    });
  }
  loadProfilePic(_id: any) {
    throw new Error('Method not implemented.');
  }

  private async initializeComponent() {
    try {
      await Promise.all([this.fetchJobs(), this.fetchRecommendedJobs()]);
      this.handleQueryParameters();
    } catch (error) {
      this.handleError(error);
    }
  }

  // Handle initial query parameters
  private handleQueryParameters() {
    this.route.queryParamMap.subscribe((params) => {
      this.searchParams.location = params.get('location') || '';
      this.searchParams.keyword = params.get('keyword') || '';

      if (this.searchParams.location || this.searchParams.keyword) {
        this.filterJobs();
      }
    });
  }

  private async fetchJobs() {
    try {
      this.state.isLoading = true;
      this.state.error = null;

      const filters = {
        page: this.state.currentPage,
        limit: this.state.jobsPerPage,
        keyword: this.searchParams.keyword,
        location: this.searchParams.location,
        sortBy: this.searchParams.sortBy,
        ...this.buildFilterParams(),
      };

      const response = await this.jobPostService
        .getAllJobPostings(filters)
        .toPromise();

      if (response) {
        this.state.jobs = response.jobs || [];
        this.state.filteredJobs = response.jobs || [];
        this.state.totalJobs = response.pagination?.totalJobs || response.pagination?.total || 0;
        this.state.currentPage = response.pagination?.currentPage || 1;
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.state.isLoading = false;
    }
  }

  private buildFilterParams(): any {
    const params: any = {};

    if (this.selectedFilters.jobTypes.length > 0) {
      params.jobType = this.selectedFilters.jobTypes.join(',');
    }

    if (this.selectedFilters.experienceLevels.length > 0) {
      params.experienceLevel = this.selectedFilters.experienceLevels.join(',');
    }

    if (this.selectedFilters.salaryRanges.length > 0) {
      params.salaryRange = this.selectedFilters.salaryRanges.join(',');
    }

    if (this.selectedFilters.remoteOptions.length > 0) {
      params.remoteOption = this.selectedFilters.remoteOptions.join(',');
    }

    return params;
  }

  private filterActiveJobs(
    jobs: JobPostingModelClient[]
  ): JobPostingModelClient[] {
    return jobs.filter((job) => 
  job.status === 'Active' || job.status === 'active'
);
  }

  private async fetchRecommendedJobs() {
    const user = await this.userService.findLoggedUser();
    if (user?._id) {
      const response = await this.jobPostService
        .getMatchedJobsByUserId(user._id)
        .toPromise();
      this.state.recommendedJobs = response?.matchedJobs || [];
    }
  }

  filterJobs() {
    this.state.currentPage = 1; // Reset to first page when filtering
    this.fetchJobs();
  }

  private matchesAllCriteria(job: JobPostingModelClient): boolean {
    return (
      this.matchesKeyword(job) &&
      this.matchesLocation(job) &&
      this.matchesJobType(job) &&
      this.matchesExperience(job) &&
      this.matchesSalaryRange(job) &&
      this.matchesRemoteOption(job)
    );
  }

  // Matching methods implementation...
  private matchesKeyword(job: JobPostingModelClient): boolean {
    if (!this.searchParams.keyword) return true;
    const searchTerm = this.searchParams.keyword.toLowerCase();
    return (
      job.title?.toLowerCase().includes(searchTerm) ||
      job.company?.toLowerCase().includes(searchTerm) ||
      job.skillsRequired?.some((skill) =>
        skill.toLowerCase().includes(searchTerm)
      )
    );
  }

  private matchesLocation(job: JobPostingModelClient): boolean {
    return (
      !this.searchParams.location ||
      job.location
        ?.toLowerCase()
        .includes(this.searchParams.location.toLowerCase())
    );
  }

  private matchesJobType(job: JobPostingModelClient): boolean {
    return (
      this.selectedFilters.jobTypes.length === 0 ||
      this.selectedFilters.jobTypes.includes(job.type)
    );
  }

  private matchesExperience(job: JobPostingModelClient): boolean {
    if (this.selectedFilters.experienceLevels.length === 0) return true;
    return this.selectedFilters.experienceLevels.some((exp) => {
      const years = parseInt(exp.match(/\d+/)?.[0] || '0', 10);
      return job.minExp >= years;
    });
  }

  private matchesSalaryRange(job: JobPostingModelClient): boolean {
    if (this.selectedFilters.salaryRanges.length === 0) return true;
    // Implementation depends on your salary data structure
    return true;
  }

  private matchesRemoteOption(job: JobPostingModelClient): boolean {
    if (this.selectedFilters.remoteOptions.length === 0) return true;
    return this.selectedFilters.remoteOptions.includes(job.workType || '');
  }

  private sortJobs() {
    this.state.filteredJobs.sort((a, b) => {
      if (this.searchParams.sortBy === 'newest') {
        return (
          new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
        );
      }
      // Add other sorting implementations as needed
      return 0;
    });
  }

  private updatePagination() {
    const startIndex = (this.state.currentPage - 1) * this.state.jobsPerPage;
    const endIndex = startIndex + this.state.jobsPerPage;
    this.state.filteredJobs = this.state.filteredJobs.slice(
      startIndex,
      endIndex
    );
  }

  onPageChange(page: number) {
    this.state.currentPage = page;
    this.fetchJobs();
  }

  resetFilters() {
    this.searchParams = {
      keyword: '',
      location: '',
      sortBy: 'newest' as 'newest' | 'relevant',
    };

    this.selectedFilters = {
      jobTypes: [],
      experienceLevels: [],
      salaryRanges: [],
      remoteOptions: [],
    };

    this.state.currentPage = 1;
    this.fetchJobs();

    // Close mobile sidebar after reset for better UX
    if (this.isMobileView() && this.state.isMobileSidebarOpen) {
      setTimeout(() => {
        this.toggleMobileSidebar();
      }, 300);
    }
  }

  viewJobDetails(job: JobPostingModelClient) {
    this.router.navigate(['/job', job._id]);
  }
  handleFilterSelection(
    group: keyof typeof this.selectedFilters,
    value: string
  ) {
    const currentFilters = this.selectedFilters[group];
    const index = currentFilters.indexOf(value);

    if (index > -1) {
      currentFilters.splice(index, 1);
    } else {
      currentFilters.push(value);
    }

    this.filterJobs();

    // Close mobile sidebar after filter selection for better UX
    if (this.isMobileView() && this.state.isMobileSidebarOpen) {
      setTimeout(() => {
        this.toggleMobileSidebar();
      }, 300); // Small delay to show the filter was applied
    }
  }

  isMobileView(): boolean {
    return this.screenWidth < 1024; // Changed from 768 to 1024 to match lg breakpoint
  }

  toggleMobileSidebar() {
    this.state.isMobileSidebarOpen = !this.state.isMobileSidebarOpen;

    // Prevent body scroll when sidebar is open
    if (this.state.isMobileSidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
  }

  onSearch() {
    this.searchSubject.next();

    // Close mobile sidebar after search for better UX
    if (this.isMobileView() && this.state.isMobileSidebarOpen) {
      setTimeout(() => {
        this.toggleMobileSidebar();
      }, 500); // Slightly longer delay for search
    }
  }

  private handleError(error: any) {
    console.error('Error in job list component:', error);
    this.state.error = 'Failed to load jobs. Please try again.';
    this.state.isLoading = false;
  }

  // New method for pagination
  getPageNumbers(): (number | string)[] {
    const totalPages = Math.ceil(this.state.totalJobs / this.state.jobsPerPage);
    const currentPage = this.state.currentPage;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 4) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 3) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }

  // Get company initial for logo fallback
  getCompanyInitial(companyName: string): string {
    if (!companyName) return '?';
    return companyName.charAt(0).toUpperCase();
  }

  // Handle image error
  onImageError(event: any) {
    // Hide the image and show the fallback
    event.target.style.display = 'none';
    const parent = event.target.parentElement;
    if (parent) {
      parent.innerHTML = `
        <div class="w-16 h-16 rounded-lg border border-gray-200 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <span class="text-white font-bold text-xl">
            ${this.getCompanyInitial(event.target.alt.replace(' logo', ''))}
          </span>
        </div>
      `;
    }
  }

  // Save current filter as a preset
  saveCurrentFilter() {
    if (this.state.savedFilters.length >= 3) {
      alert(
        'You can only save up to 3 filters. Please delete one before saving a new one.'
      );
      return;
    }
    this.state.showSaveFilterModal = true;
  }

  // Confirm save filter
  confirmSaveFilter() {
    if (!this.state.currentFilterName.trim()) {
      alert('Please enter a name for your filter.');
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: this.state.currentFilterName.trim(),
      searchParams: { ...this.searchParams },
      selectedFilters: { ...this.selectedFilters },
      createdAt: new Date(),
    };

    this.state.savedFilters.push(newFilter);
    this.saveFiltersToStorage();
    this.state.showSaveFilterModal = false;
    this.state.currentFilterName = '';
  }

  // Load a saved filter
  loadSavedFilter(filter: SavedFilter) {
    this.searchParams = { ...filter.searchParams };
    this.selectedFilters = { ...filter.selectedFilters };
    this.state.currentPage = 1;
    this.fetchJobs();

    // Close mobile sidebar after loading filter for better UX
    if (this.isMobileView() && this.state.isMobileSidebarOpen) {
      setTimeout(() => {
        this.toggleMobileSidebar();
      }, 300);
    }
  }

  // Delete a saved filter
  deleteSavedFilter(filterId: string) {
    if (confirm('Are you sure you want to delete this filter?')) {
      this.state.savedFilters = this.state.savedFilters.filter(
        (f) => f.id !== filterId
      );
      this.saveFiltersToStorage();
    }
  }

  // Save filters to localStorage
  private saveFiltersToStorage() {
    if (this.user && this.user._id) {
      localStorage.setItem(
        `savedFilters_${this.user._id}`,
        JSON.stringify(this.state.savedFilters)
      );
    }
  }

  // Load filters from localStorage
  private loadFiltersFromStorage() {
    if (this.user && this.user._id) {
      const saved = localStorage.getItem(`savedFilters_${this.user._id}`);
      if (saved) {
        try {
          this.state.savedFilters = JSON.parse(saved);
        } catch (error) {
          console.error('Error loading saved filters:', error);
          this.state.savedFilters = [];
        }
      }
    }
  }

  // Cancel save filter modal
  cancelSaveFilter() {
    this.state.showSaveFilterModal = false;
    this.state.currentFilterName = '';
  }
}
