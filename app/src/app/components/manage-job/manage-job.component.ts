import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { JobListingService } from '../../services/job-listing.service';
import { SaveJobService } from '../../services/save-job.service';
import { UserService } from '../../services/user.service';
import { JobPostingService } from '../../services/job-posting.service';
import { JobPostingModelClient } from '../../models/job-posting.model.client';
import { finalize } from 'rxjs/operators';
import { AIAnalysisResult } from '../ai-analysis-modal/ai-analysis-modal.component';
import { AppliedUsersListComponent } from '../skill-list/applied-users-list/applied-users-list.component';
import { PvcUsersListComponent } from '../skill-list/pvc-users-list/pvc-users-list.component';
import { MatchedUsersListComponent } from '../skill-list/matched-users-list/matched-users-list.component';
import { fadeIn, fadeInUp, scaleIn, slideInLeft } from '../../shared/animations';
import { environment } from '../../../environments/environment';
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  username: string;
  skills: string[];
  experience?: number;
  profilePictureUrl?: string;
  socialContact?: { socialtype: string; url: string }[];
  location?: string;
  _id?: string;
}

interface MatchedUser {
  user: User;
  totalScore: number;
  skillMatchPercentage: number;
  matchScoreBreakdown: {
    skills: number;
    experience: number;
    location: number;
    salary: number;
  };
}

interface JobApplication {
  applicationId: string;
  userName: User;
  application: {
    user: any;
    status: string;
    dateApplied: Date;
  };
  status?: string;
  profilePicUrl?: string;
  profilePicExist?: boolean;
}

// Add interface for AI Analysis results
interface AIAnalysisResults {
  overallScore: number;
  strengths: string[]
  gaps: string[];
  assignments: {
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  confidence: number;
  detailedBreakdown: {
    skills: any;
    experience: any;
    location: any;
    salary: any;
    qualification: any;
  };
}

@Component({
  selector: 'app-manage-job',
  templateUrl: './manage-job.component.html',
  styleUrl: './manage-job.component.css',
  animations: [fadeIn, fadeInUp, scaleIn, slideInLeft]
})
export class ManageJobComponent implements OnInit {
  // Core properties
  @Input() job: JobPostingModelClient = new JobPostingModelClient();
  @Input() jobIdInput: string | null = null;
  @Input() user: any;
  isButtonDisabled = true;
  jobId!: string;
  loading: boolean = true;
  selectedView: string = 'appliedUsers';
  isModalOpen: boolean = false;
  selectedCandidate: any = null;
  modalType: string = '';
  showProfilePopover: boolean = false;

  // Profile picture properties
  profilePicUrl: string = '';
  profilePicExist: boolean = false;
  defaultProfilePicUrl: string = '../../../assets/defaultUser.jpg';
  currentPage: number = 1;
  totalItems: number = 2; // Example total items
  itemsPerPage: number = 1; // Items per page
  totalPages: number = Math.ceil(this.totalItems / this.itemsPerPage);
  // Data collections
  jobApplications: JobApplication[] = [];
  pvcListUsers: JobApplication[] = [];
  matchedUsers: MatchedUser[] = [];
  
  // Aliases for template clarity
  get appliedUsers(): JobApplication[] {
    return this.jobApplications;
  }
  
  get pvcUsers(): JobApplication[] {
    return this.pvcListUsers;
  }
  
  // Count getters
  get appliedUsersCount(): number {
    return this.jobApplications?.length || 0;
  }
  
  get matchedUsersCount(): number {
    return this.matchedUsers?.length || 0;
  }
  
  get pvcUsersCount(): number {
    return this.pvcListUsers?.length || 0;
  }

  // Filters and sorting
  searchTerm: string = '';
  sortBy: string = 'matchScore';
  sortDirection: 'asc' | 'desc' = 'desc';
  statusFilter: string = 'all';

  // API base URL
  baseUrl: string = '';
  usersList: any;

  // AI Analysis properties
  isAIAnalysisModalOpen = false;
  isAnalyzing = false;
  aiAnalysisResults: AIAnalysisResult | null = null;
  selectedCandidateForAnalysis: any = null;

  constructor(
    private jobService: JobListingService,
    private route: ActivatedRoute,
    private saveJobService: SaveJobService,
    private userService: UserService,
    private jobPosting: JobPostingService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeComponent();
  }

  /**
   * Initializes the component and loads all necessary data
   */
  private initializeComponent() {
    // Determine job ID and base URL
    this.jobId = this.jobIdInput || this.route.snapshot.paramMap.get('id')!;
    this.baseUrl = environment.apiUrl;

    if (!this.jobId) {
      console.error('No job ID provided');
      this.loading = false;
      return;
    }

    // Load user data
    this.userService.findLoggedUser().then((user) => {
      this.user = user;

      // Load all data in parallel
      this.loadJobDetails()
        .then(() => Promise.all([
          this.loadAppliedUsers(),
          this.loadPvcUsers(),
          this.loadMatchedUsers(),
        ]))
        .then(() => {
          this.loading = false;
        })
        .catch((error) => {
          console.error('Error loading data', error);
          this.loading = false;
        });
    });
  }

  /**
   * Loads job posting details
   */
  private loadJobDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.jobPosting.getJobPostingById(this.jobId).subscribe(
        (jobDetails: JobPostingModelClient) => {
          this.job = jobDetails;
          resolve();
        },
        (error) => {
          console.error('Error loading job details', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Loads applied users for the current job
   */
  private loadAppliedUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.saveJobService
        .getAppliedUsersForJob(this.jobId, this.job.jobSource)
        .then((response) => {
          if (response && Array.isArray(response.appliedUsers)) {
            this.jobApplications = response.appliedUsers;

            // Load profile pictures for each applied user
            this.jobApplications.forEach((application) => {
              if (application.application?.user?._id) {
                this.loadUserProfilePic(application);
              }
            });
          }
          resolve();
        })
        .catch((error) => {
          console.error('Error loading applied users', error);
          reject(error);
        });
    });
  }

  /**
   * Loads users in the PVC (pre-vetted candidates) list
   */
  private loadPvcUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .get<JobApplication[]>(`${this.baseUrl}/api/pvcList/${this.jobId}`)
        .subscribe(
          (users) => {
            this.pvcListUsers = users;
            // Load profile pictures for each PVC user
            this.pvcListUsers.forEach((user) => {
              if (user.userName && user.userName._id) {
                this.loadUserProfilePic(user);
              }
            });
            resolve();
          },
          (error) => {
            console.error('Error loading PVC users', error);
            reject(error);
          }
        );
    });
  }

  /**
   * Loads matched users with their scores
   */
  private loadMatchedUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .get<{ topMatches: MatchedUser[] }>(
          `${this.baseUrl}/api/jobPosting/${this.jobId}/matchUsersWithScore`,
          { withCredentials: true }
        )
        .subscribe(
          (response) => {
            this.matchedUsers = response.topMatches;
            this.usersList = this.matchedUsers.map((match) => match.user);

            // Load profile pictures for matched users
            this.matchedUsers.forEach((matchedUser) => {
              if (matchedUser.user && matchedUser.user._id) {
                this.loadMatchedUserProfilePic(matchedUser);
              }
            });

          
            resolve();
          },
          (error) => {
            console.error('Error loading matched users', error);
            reject(error);
          }
        );
    });
  }

  /**
   * Sets default profile picture
   */
  setDefaultProfilePic(target: any) {
    if (target) {
      // Set profilePicUrl in various possible locations
      if (target.application?.user) {
        target.application.user.profilePictureUrl = this.defaultProfilePicUrl;
      } else if (target.userName) {
        target.userName.profilePictureUrl = this.defaultProfilePicUrl;
      } else if (target.user) {
        target.user.profilePictureUrl = this.defaultProfilePicUrl;
      }
      target.profilePicUrl = this.defaultProfilePicUrl;
      target.profilePicExist = false;
    }
  }

  /**
   * Load profile picture for a job application user
   */

  private loadUserProfilePic(userApplication: JobApplication): void {
    const userId = userApplication.application.user._id;
    if (!userId) return;

    this.userService.getProfilePic(userId).subscribe({
      next: (data: Blob) => {
        if (data && data.size > 0) {
          const reader = new FileReader();
          reader.onload = () => {
            userApplication.profilePicUrl = reader.result as string;
            userApplication.profilePicExist = true;
          };
          reader.readAsDataURL(data);
        } else {
          this.setDefaultProfilePic(userApplication);
        }
      },
      error: (error) => {
        console.error('Error fetching profile picture:', error);
        this.setDefaultProfilePic(userApplication);
      },
    });
  }

  /**
   * Load profile picture for a matched user
   */
  private loadMatchedUserProfilePic(matchedUser: MatchedUser): void {
    const userId = matchedUser.user._id;
    if (!userId) return;

    // Add profilePic properties to the matched user object
    (matchedUser as any).profilePicUrl = '';
    (matchedUser as any).profilePicExist = false;

    this.userService.getProfilePic(userId).subscribe({
      next: (data: Blob) => {
        if (data && data.size > 0) {
          const reader = new FileReader();
          reader.onload = () => {
            (matchedUser as any).profilePicUrl = reader.result as string;
            (matchedUser as any).profilePicExist = true;
          };
          reader.readAsDataURL(data);
        } else {
          this.setDefaultProfilePic(matchedUser);
        }
      },
      error: (error) => {
        console.error('Error fetching profile picture:', error);
        this.setDefaultProfilePic(matchedUser);
      },
    });
  }

  /**
   * Moves a candidate to the PVC list
   */
  moveToPVC(userId: string) {
    this.loading = true;

    // Get the application ID from the correct list based on current view
    let applicationId;
    if (this.selectedView === 'appliedUsers') {
      const application = this.jobApplications.find(
        (app) => app.userName._id === userId
      );
      applicationId = application?.applicationId;
    } else if (this.selectedView === 'matchedUsers') {
      // For matched users, we need to create a PVC entry
      applicationId = null;
    }

    if (this.selectedView === 'matchedUsers' || applicationId) {
      const payload = { userId: userId };
      const endpoint = applicationId
        ? `${this.baseUrl}/jobApplication/${applicationId}/moveToPVC`
        : `${this.baseUrl}/pvcList/create/${this.jobId}`;

      this.http
        .put(endpoint, payload)
        .pipe(
          finalize(() => {
            // Refresh relevant lists
            Promise.all([this.loadAppliedUsers(), this.loadPvcUsers()]).then(
              () => {
                this.loading = false;
                this.showNotification('Candidate moved to PVC successfully');
              }
            );
          })
        )
        .subscribe(
          (response) => {
            console.log('User moved to PVC list', response);
          },
          (error) => {
            console.error('Error moving user to PVC list', error);
            this.showNotification('Failed to move candidate to PVC', 'error');
          }
        );
    } else {
      this.loading = false;
      this.showNotification(
        'Unable to move candidate - application ID not found',
        'error'
      );
    }
  }

  /**
   * Updates candidate application status
   */
  updateCandidateStatus(applicationId: string, status: string) {
    this.loading = true;

    this.http
      .put(`${this.baseUrl}/api/job-applications/${applicationId}/status`, { status })
      .pipe(
        finalize(() => {
          this.loadAppliedUsers().then(() => {
            this.loading = false;
            this.showNotification(`Candidate status updated to ${status}`);
            this.closeModal();
          });
        })
      )
      .subscribe(
        (response) => {
          console.log('Status updated successfully', response);
        },
        (error) => {
          console.error('Error updating status', error);
          this.showNotification('Failed to update candidate status', 'error');
        }
      );
  }

  /**
   * Opens modal dialog for various actions
   */
  openModal(type: string, candidate: any) {
    this.selectedCandidate = candidate;
    this.modalType = type;
    this.isModalOpen = true;
  }

  /**
   * Closes the modal dialog
   */
  closeModal() {
    this.isModalOpen = false;
    this.selectedCandidate = null;
    this.modalType = '';
  }

  /**
   * Shows a notification toast message
   */
  private showNotification(
    message: string,
    type: 'success' | 'error' = 'success'
  ) {
    // Implementation would connect to a notification service
    console.log(`[${type}] ${message}`);
    // For now we'll use browser alert as placeholder
    // In production, replace with proper toast notification
    if (type === 'error') {
      alert(`Error: ${message}`);
    }
  }

  /**
   * Filters candidates based on search term and filters
   */
  get filteredCandidates(): any[] {
    let result: any[] = [];

    // Select the right data source based on selected view
    if (this.selectedView === 'appliedUsers') {
      result = [...this.jobApplications];
    } else if (this.selectedView === 'pvcUsers') {
      result = [...this.pvcListUsers];
    } else if (this.selectedView === 'matchedUsers') {
      result = [...this.matchedUsers];
    }

    // Apply search filter if provided
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter((item) => {
        const candidate =
          this.selectedView === 'matchedUsers' ? item.user : item.userName;
        return (
          candidate.firstName?.toLowerCase().includes(term) ||
          candidate.lastName?.toLowerCase().includes(term) ||
          candidate.email?.toLowerCase().includes(term) ||
          candidate.username?.toLowerCase().includes(term) ||
          candidate.skills?.some((skill: string) =>
            skill.toLowerCase().includes(term)
          )
        );
      });
    }

    // Apply status filter for applied users
    if (this.selectedView === 'appliedUsers' && this.statusFilter !== 'all') {
      result = result.filter(
        (item) =>
          item.application.status.toLowerCase() ===
          this.statusFilter.toLowerCase()
      );
    }

    // Sort results
    result.sort((a, b) => {
      let valueA, valueB;

      if (
        this.sortBy === 'matchScore' &&
        this.selectedView === 'matchedUsers'
      ) {
        valueA = a.totalScore;
        valueB = b.totalScore;
      } else if (this.sortBy === 'name') {
        const candidateA =
          this.selectedView === 'matchedUsers' ? a.user : a.userName;
        const candidateB =
          this.selectedView === 'matchedUsers' ? b.user : b.userName;
        valueA = `${candidateA.firstName} ${candidateA.lastName}`.toLowerCase();
        valueB = `${candidateB.firstName} ${candidateB.lastName}`.toLowerCase();
        return this.sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      } else if (
        this.sortBy === 'date' &&
        this.selectedView === 'appliedUsers'
      ) {
        valueA = new Date(a.application.dateApplied).getTime();
        valueB = new Date(b.application.dateApplied).getTime();
      } else {
        return 0;
      }

      if (valueA === valueB) return 0;
      const comparison = valueA > valueB ? 1 : -1;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }

  /**
   * Toggles sort direction
   */
  toggleSort(field: string) {
    if (this.sortBy === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDirection = 'desc';
    }
  }

  /**
   * Returns the count of candidates for a tab
   */
  getCandidateCount(view: string): number {
    if (view === 'appliedUsers') return this.jobApplications?.length || 0;
    if (view === 'pvcUsers') return this.pvcListUsers?.length || 0;
    if (view === 'matchedUsers') return this.matchedUsers?.length || 0;
    return 0;
  }

  /**
   * Returns status badge color based on application status
   */
  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'screening':
        return 'bg-purple-100 text-purple-800';
      case 'interview':
        return 'bg-yellow-100 text-yellow-800';
      case 'offer':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'hired':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Returns match score color based on score value
   */
  getMatchScoreColor(score: number): string {
    if (score >= 85) return 'bg-emerald-100 text-emerald-800';
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  }

  /**
   * Gets profile picture URL for a user with fallback to default
   */
  getUserProfilePicUrl(item: any): string {
    // Check various possible locations for profile picture
    if (item.profilePicUrl) return item.profilePicUrl;
    if (item.application?.user?.profilePictureUrl) return item.application.user.profilePictureUrl;
    if (item.userName?.profilePictureUrl) return item.userName.profilePictureUrl;
    if (item.user?.profilePictureUrl) return item.user.profilePictureUrl;
    if (this.selectedView === 'matchedUsers') {
      return (item as any).profilePicUrl || this.defaultProfilePicUrl;
    } else {
      return (item as any).profilePicUrl || this.defaultProfilePicUrl;
    }
  }

  get firstItemIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  get lastItemIndex(): number {
    return Math.min(this.firstItemIndex + this.itemsPerPage, this.totalItems);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  /**
   * Opens the AI Analysis modal and starts the analysis
   */
  openAIAnalysisModal(candidate: any): void {
    this.isAIAnalysisModalOpen = true;
    this.isAnalyzing = true;
    this.aiAnalysisResults = null;

    // Call the AI analysis API
    this.http
      .post<AIAnalysisResults>(`${this.baseUrl}/api/user/ai-analyze`, {
        jobId: this.jobId,
        userId: candidate.user._id,
      })
      .subscribe({
        next: (results) => {
          this.aiAnalysisResults = results;
          this.isAnalyzing = false;
        },
        error: (error) => {
          console.error('Error performing AI analysis:', error);
          this.isAnalyzing = false;
          this.showNotification('Failed to perform AI analysis', 'error');
        },
      });
  }

  /**
   * Closes the AI Analysis modal
   */
  closeAIAnalysisModal(): void {
    this.isAIAnalysisModalOpen = false;
    this.aiAnalysisResults = null;
  }

  /**
   * Shows the profile popover for a candidate
   */
  showProfilePopoverFor(candidate: any) {
    this.selectedCandidate = candidate;
    this.showProfilePopover = true;
  }

  /**
   * Closes the profile popover
   */
  closeProfilePopover() {
    this.showProfilePopover = false;
    this.selectedCandidate = null;
  }

  /**
   * Selects a view (tab)
   */
  selectView(view: string): void {
    this.selectedView = view;
  }

  /**
   * Gets the count of shortlisted candidates
   */
  getShortlistedCount(): number {
    return this.jobApplications.filter((app: any) => 
      app.application?.status === 'shortlisted' || app.status === 'shortlisted'
    ).length;
  }

  /**
   * Gets candidates for the current view
   */
  getCandidatesForCurrentView(): any[] {
    switch (this.selectedView) {
      case 'appliedUsers':
        return this.jobApplications || [];
      case 'matchedUsers':
        return this.matchedUsers || [];
      case 'pvcUsers':
        return this.pvcListUsers || [];
      default:
        return [];
    }
  }

  /**
   * Gets empty state message based on current view
   */
  getEmptyStateMessage(): string {
    switch (this.selectedView) {
      case 'appliedUsers':
        return 'No applications received yet. Share your job posting to attract candidates.';
      case 'matchedUsers':
        return 'No matched candidates found. Our AI will match candidates based on skills and requirements.';
      case 'pvcUsers':
        return 'No PVC candidates yet. Premium candidates will appear here once they view your posting.';
      default:
        return 'No candidates available.';
    }
  }

  /**
   * Gets initials from first and last name
   */
  getInitials(firstName: string, lastName: string): string {
    if (!firstName && !lastName) return '??';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '??';
  }

  /**
   * Shortlists a candidate
   */
  shortlistCandidate(candidate: any): void {
  const applicationId = candidate.applicationId || candidate.application?._id;
  if (applicationId) {
    this.updateCandidateStatus(applicationId, 'shortlisted');
  } else {
    this.showNotification('Cannot shortlist: application ID not found', 'error');
  }
  this.closeModal();
}
  /**
   * Reloads job data
   */
  // ✅ AFTER
  loadJobData(): void {
    this.loading = true;
    this.loadJobDetails()
      .then(() => Promise.all([
        this.loadAppliedUsers(),
        this.loadPvcUsers(),
        this.loadMatchedUsers(),
      ]))
      .then(() => { this.loading = false; })
      .catch((error: any) => {
        console.error('Error loading data', error);
        this.loading = false;
      });
  }
  
  // Helper methods for template
  getCandidateName(application: any): string {
    if (application.application?.user) {
      return `${application.application.user.firstName || ''} ${application.application.user.lastName || ''}`.trim();
    }
    if (application.userName) {
      return `${application.userName.firstName || ''} ${application.userName.lastName || ''}`.trim();
    }
    if (application.user) {
      return `${application.user.firstName || ''} ${application.user.lastName || ''}`.trim();
    }
    return 'Unknown Candidate';
  }

  getCandidateFirstName(application: any): string {
    return application.application?.user?.firstName || 
           application.userName?.firstName || 
           application.user?.firstName || '';
  }

  getCandidateLastName(application: any): string {
    return application.application?.user?.lastName || 
           application.userName?.lastName || 
           application.user?.lastName || '';
  }

  getCandidateEmail(application: any): string {
    return application.application?.user?.email || 
           application.userName?.email || 
           application.user?.email || 'No email';
  }


  getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
      'shortlisted': 'success',
      'accepted': 'success',
      'hired': 'success',
      'pending': 'warning',
      'reviewing': 'warning',
      'rejected': 'danger',
      'withdrawn': 'danger',
    };
    return statusMap[status?.toLowerCase()] || 'neutral';
  }

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

  trackByApplicationId(index: number, application: any): string {
    return application.applicationId || application._id || index.toString();
  }

  trackByMatchedUserId(index: number, match: any): string {
    return match.user?._id || match.user?.id || index.toString();
  }

  trackByPVCUserId(index: number, pvcUser: any): string {
    return pvcUser.applicationId || pvcUser._id || index.toString();
  }

  viewCandidateProfile(candidate: any): void {
    const userId = this.getCandidateUserId(candidate);
    if (userId) {
      this.router.navigate(['/profile-seeker', userId]);
    }
  }

  getCandidateUserId(candidate: any): string {
    return candidate.user?._id || 
           candidate.userName?._id || 
           candidate.application?.user?._id || '';
  }

  performAIAnalysis(candidate: any): void {
    this.selectedCandidate = candidate;
    this.modalType = 'aiAnalysis';
    this.isModalOpen = true;
    this.openAIAnalysisModal(candidate);
  }

  // Math helper for template
  Math = Math;
}
