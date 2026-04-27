// profile-list.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { JobListingService } from '../../services/job-listing.service';
import { SaveJobService } from '../../services/save-job.service';
import { UserService } from '../../services/user.service';
import { JobPostingService } from '../../services/job-posting.service';
import { JobPostingModelClient } from '../../models/job-posting.model.client';
import { finalize } from 'rxjs/operators';
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
  socialContact?: {socialtype: string, url: string}[];
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
    status: string;
    dateApplied: Date;
  };
  status?: string;
  profilePicUrl?: string;
  profilePicExist?: boolean;
}

@Component({
  selector: 'app-profile-list',
  templateUrl: './profile-list.component.html',
  styleUrls: ['./profile-list.component.css']
})
export class ProfileListComponent implements OnInit {
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
  
  // Profile picture properties
  profilePicUrl: string = '';
  profilePicExist: boolean = false;
  defaultProfilePicUrl: string = '../../../assets/defaultUser.jpg';
  
  // Data collections
  jobApplications: JobApplication[] = [];
  pvcListUsers: JobApplication[] = [];
  matchedUsers: MatchedUser[] = [];
  
  // Filters and sorting
  searchTerm: string = '';
  sortBy: string = 'matchScore';
  sortDirection: 'asc' | 'desc' = 'desc';
  statusFilter: string = 'all';
  
  // API base URL
  baseUrl: string = '';
  usersList: any;
  
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
    this.userService.findLoggedUser().then(user => {
      this.user = user;
      
      // Load all data in parallel
      Promise.all([
        this.loadJobDetails(),
        this.loadAppliedUsers(),
        this.loadPvcUsers(),
        this.loadMatchedUsers()
      ]).then(() => {
        this.loading = false;
      }).catch(error => {
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
        error => {
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
      this.saveJobService.getAppliedUsersForJob(this.jobId, this.job.jobSource)
        .then(response => {
          if (response && Array.isArray(response.appliedUsers)) {
            this.jobApplications = response.appliedUsers;
            // Load profile pictures for each applied user
            this.jobApplications.forEach(application => {
              if (application.userName && application.userName._id) {
                this.loadUserProfilePic(application);
              }
            });
          }
          resolve();
        })
        .catch(error => {
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
      this.http.get<JobApplication[]>(`${this.baseUrl}/pvcList/${this.jobId}`).subscribe(
        users => {
          this.pvcListUsers = users;
          // Load profile pictures for each PVC user
          this.pvcListUsers.forEach(user => {
            if (user.userName && user.userName._id) {
              this.loadUserProfilePic(user);
            }
          });
          resolve();
        },
        error => {
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
      this.http.get<{topMatches: MatchedUser[]}>(`${this.baseUrl}/api/jobPosting/${this.jobId}/matchUsersWithScore`, { withCredentials: true })
        .subscribe(
          response => {
            this.matchedUsers = response.topMatches;
            this.usersList = this.matchedUsers.map(match => match.user);
            
            // Load profile pictures for matched users
            this.matchedUsers.forEach(matchedUser => {
              if (matchedUser.user && matchedUser.user._id) {
                this.loadMatchedUserProfilePic(matchedUser);
              }
            });
            
            console.log("users with profile pics", this.usersList);
            resolve();
          },
          error => {
            console.error('Error loading matched users', error);
            reject(error);
          }
        );
    });
  }
  
  /**
   * Sets default profile picture
   */
  private setDefaultProfilePic(target: any) {
    if (target) {
      target.profilePicUrl = this.defaultProfilePicUrl;
      target.profilePicExist = false;
    }
  }
  
  /**
   * Load profile picture for a job application user
   */

  
  private loadUserProfilePic(userApplication: JobApplication): void {
    const userId = userApplication.userName._id;
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
      }
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
      }
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
      const application = this.jobApplications.find(app => app.userName._id === userId);
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
        
      this.http.put(endpoint, payload)
        .pipe(finalize(() => {
          // Refresh relevant lists
          Promise.all([
            this.loadAppliedUsers(),
            this.loadPvcUsers()
          ]).then(() => {
            this.loading = false;
            this.showNotification('Candidate moved to PVC successfully');
          });
        }))
        .subscribe(
          response => {
            console.log('User moved to PVC list', response);
          },
          error => {
            console.error('Error moving user to PVC list', error);
            this.showNotification('Failed to move candidate to PVC', 'error');
          }
        );
    } else {
      this.loading = false;
      this.showNotification('Unable to move candidate - application ID not found', 'error');
    }
  }
  
  /**
   * Updates candidate application status
   */
  updateCandidateStatus(applicationId: string, status: string) {
    this.loading = true;
    
    this.http.put(`${this.baseUrl}/api/job-applications/${applicationId}/status`, { status })
      .pipe(finalize(() => {
        this.loadAppliedUsers().then(() => {
          this.loading = false;
          this.showNotification(`Candidate status updated to ${status}`);
          this.closeModal();
        });
      }))
      .subscribe(
        response => {
          console.log('Status updated successfully', response);
        },
        error => {
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
  private showNotification(message: string, type: 'success' | 'error' = 'success') {
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
      result = result.filter(item => {
        const candidate = this.selectedView === 'matchedUsers' ? item.user : item.userName;
        return (
          candidate.firstName?.toLowerCase().includes(term) ||
          candidate.lastName?.toLowerCase().includes(term) ||
          candidate.email?.toLowerCase().includes(term) ||
          candidate.username?.toLowerCase().includes(term) ||
          candidate.skills?.some((skill: string) => skill.toLowerCase().includes(term))
        );
      });
    }
    
    // Apply status filter for applied users
    if (this.selectedView === 'appliedUsers' && this.statusFilter !== 'all') {
      result = result.filter(item => 
        item.application.status.toLowerCase() === this.statusFilter.toLowerCase()
      );
    }
    
    // Sort results
    result.sort((a, b) => {
      let valueA, valueB;
      
      if (this.sortBy === 'matchScore' && this.selectedView === 'matchedUsers') {
        valueA = a.totalScore;
        valueB = b.totalScore;
      } else if (this.sortBy === 'name') {
        const candidateA = this.selectedView === 'matchedUsers' ? a.user : a.userName;
        const candidateB = this.selectedView === 'matchedUsers' ? b.user : b.userName;
        valueA = `${candidateA.firstName} ${candidateA.lastName}`.toLowerCase();
        valueB = `${candidateB.firstName} ${candidateB.lastName}`.toLowerCase();
        return this.sortDirection === 'asc' ? 
          valueA.localeCompare(valueB) : 
          valueB.localeCompare(valueA);
      } else if (this.sortBy === 'date' && this.selectedView === 'appliedUsers') {
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
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'screening': return 'bg-purple-100 text-purple-800';
      case 'interview': return 'bg-yellow-100 text-yellow-800';
      case 'offer': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'hired': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
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
    if (this.selectedView === 'matchedUsers') {
      return (item as any).profilePicUrl || this.defaultProfilePicUrl;
    } else {
      console.log("££££££££££££££££££££",item)
      return item.profilePicUrl || this.defaultProfilePicUrl;
    }
  }
}