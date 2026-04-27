import { environment } from '../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { JobPostingService } from '../../services/job-posting.service';
import { userDetails } from '../../models/userDetails.model.client';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ScheduleInterviewModalComponent } from '../schedule-interview-modal/schedule-interview-modal.component';
import { AssignmentModalComponent } from '../assignment-modal/assignment-modal.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { fadeIn, fadeInUp, fadeInDown, scaleIn, slideInLeft, listAnimation, slideToggle } from '../../shared/animations';
interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
}
interface AIAnalysisResults {
  overallScore: number;
  strengths: string[];
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
  selector: 'app-job-application',
  templateUrl: './job-application.component.html',
  styleUrls: ['./job-application.component.css'],
  animations: [fadeIn, fadeInUp, fadeInDown, scaleIn, slideInLeft, listAnimation, slideToggle]
})
export class JobApplicationComponent implements OnInit {
  userId!: string;
  jobId!: string;
  user: userDetails['user'] | undefined;
  experiences: userDetails['experiences'] = [];
  education: userDetails['education'] = [];
  skills: userDetails['skill'] = [];
  projects: userDetails['project'] = [];
  resume: any[] = [];
  jobApplication: any;
  jobDetails: any;
  errorMessage!: string;
  loading = true;
  comments: Comment[] = [];
  commentForm: FormGroup;
  showActionModal = false;
  url: string;
  applicationId!: string;
  isPdfExport: boolean = false;
  feature?: string;
  isAIAnalysisModalOpen: boolean = false;
  isAnalyzing: boolean = false;
  aiAnalysisResults: any = null;
  newComment: string = '';
  currentUser: any = null; // You may need to get this from auth service
  showFullProfile: boolean = false;
  showFullCover: boolean = false;
  expandedQuestions: { [key: number]: boolean } = {};
  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private jobPostingService: JobPostingService,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private http: HttpClient,
    private dialog: MatDialog,
    private sanitizer: DomSanitizer
  ) {
    this.commentForm = this.fb.group({
      commentText: ['', Validators.required],
    });

    this.url = environment.apiUrl;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.jobId = params.get('jobId') || '';
      this.userId = params.get('userId') || '';

      if (this.jobId && this.userId) {
        this.fetchJobApplication();
        this.fetchUserDetails();
        this.fetchJobDetails();
        // this.fetchComments();
      } else {
        this.errorMessage = 'Job ID or User ID is missing.';
        this.loading = false;
      }
    });
  }
  openScheduleInterviewModal(): void {
    const dialogRef = this.dialog.open(ScheduleInterviewModalComponent, {
      width: '500px',
      data: {
        jobTitle: this.jobDetails.title,
        applicantName: `${this.user?.firstName} ${this.user?.lastName}`,
        applicantEmail: this.user?.email,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.scheduleInterview(result);
      }
    });
  }
  // Modal management
  openActionModal() {
    this.showActionModal = true;
  }

  closeActionModal() {
    this.showActionModal = false;
  }
  scheduleInterview(interviewDetails: any): void {
    // Here you would typically call a service method to handle the API request
    this.jobPostingService
      .scheduleInterview(this.jobApplication._id, interviewDetails)
      .subscribe(
        (response) => {
          this.jobApplication.status = 'interviewing';
          this.toastr.success('Interview scheduled successfully');
        },
        (error) => {
          this.toastr.error('Error scheduling interview');
        }
      );
  }
 fetchJobApplication(): void {
  this.jobPostingService
    .getJobApplicationByJobIdAndUserId(this.jobId, this.userId)
    .subscribe(
      (data) => {
        this.jobApplication = data;
        this.applicationId = this.jobApplication?._id;

        // Auto-mark as Viewed when recruiter opens the application
        const nonViewableStatuses = ['shortlisted', 'interview', 'interviewing', 'offer', 'accepted', 'rejected'];
        if (this.jobApplication?._id &&
            !nonViewableStatuses.includes(this.jobApplication?.status?.toLowerCase())) {
          this.jobPostingService
            .updateApplicationStatus(this.jobApplication._id, 'viewed')
            .subscribe({
              next: (res) => {
                console.log('✅ Marked as viewed:', res);
                this.jobApplication.status = 'viewed';
              },
              error: (err) => {
                console.error('❌ Failed to mark as viewed:', err);
              }
            });
        } else {
          console.log('⚠️ Not marking viewed. Current status:', this.jobApplication?.status);
        }

          // If userId is not available from route, try to get it from jobApplication
          if (!this.userId && this.jobApplication?.user) {
            this.userId = typeof this.jobApplication.user === 'string' 
              ? this.jobApplication.user 
              : this.jobApplication.user._id || this.jobApplication.user.id;
          }

          // Ensure that applicationId is set before calling fetchComments
          if (this.applicationId) {
            this.fetchComments();
          }
          this.loading = false;
        },
        (error) => {
          this.errorMessage =
            'Error fetching job application: ' + error.message;
          this.loading = false;
        }
      );
  }
  fetchComments(): void {
    this.http
      .get<Comment[]>(
        `${this.url}/api/job-applications/${this.applicationId}/comments`
      )
      .subscribe(
        (comments) => {
          this.comments = comments;
        },
        (error) => {
          this.toastr.error('Error fetching comments');
          console.error('Error fetching comments:', error);
        }
      );
  }

  addComment(): void {
    if (this.newComment && this.newComment.trim()) {
      this.http
        .post<Comment>(
          `${this.url}/api/job-applications/${this.applicationId}/comments`,
          { text: this.newComment.trim() }
        )
        .subscribe(
          (newComment) => {
            this.comments.unshift(newComment);
            this.newComment = '';
            this.toastr.success('Comment added successfully');
          },
          (error) => {
            this.toastr.error('Error adding comment');
            console.error('Error adding comment:', error);
          }
        );
    }
  }
  fetchUserDetails(): void {
    this.feature = 'viewprofile';
    this.userService.getUserDetails(this.userId, this.feature).subscribe(
      (response: {
        data: {
          user: any;
          experiences: any[];
          education: any[];
          skill: any[];
          project: any[];
        };
      }) => {
        const { user, experiences, education, skill, project } = response.data;

        this.user = user || null;
        this.experiences = experiences || [];
        this.education = education || [];
        this.skills = skill || [];
        this.projects = project || [];

        this.fetchUserResume();
      },
      (error: any) => {
        console.error('Error fetching user details:', error.message || error);
      }
    );
  }

  fetchUserResume(): void {
    this.userService.getUserResume(this.userId).subscribe(
      (response: any[]) => {
        if (response.length > 0) {
          const latestFile = response[response.length - 1];
          this.resume = [
            {
              filename: latestFile.filename,
              originalname: latestFile.originalname,
              contentType: latestFile.contentType,
            },
          ];
        }
      },
      (error) => {
        console.error('Error fetching resume:', error);
      }
    );
  }

  fetchJobDetails(): void {
    this.jobPostingService.getJobPostingById(this.jobId).subscribe(
      (data) => {
        this.jobDetails = data;
      },
      (error) => {
        console.error('Error fetching job details:', error);
      }
    );
  }

  updateStatus(newStatus: string): void {
    this.jobPostingService
      .updateApplicationStatus(this.jobApplication._id, newStatus)
      .subscribe(
        (response) => {
          this.jobApplication.status = newStatus;
          this.toastr.success('Application status updated successfully');
        },
        (error) => {
          this.toastr.error('Error updating application status');
        }
      );
  }

  downloadResume(filename: string, contentType: string): void {
    this.userService.downloadPDF(filename, this.userId).subscribe(
      (res: Blob) => {
        const file = new Blob([res], { type: contentType });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL);
      },
      (error) => {
        this.toastr.error('Error downloading resume');
      }
    );
  }

  openAssignmentModal(): void {
    const dialogRef = this.dialog.open(AssignmentModalComponent, {
      width: '500px',
      data: {
        jobTitle: this.jobDetails.title,
        applicantName: `${this.user?.firstName} ${this.user?.lastName}`,
        applicantEmail: this.user?.email,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.sendAssignment(result);
      }
    });
  }

  sendAssignment(assignmentDetails: any): void {
    const assignment = {
      ...assignmentDetails,
      jobApplicationId: this.applicationId,
      userId: this.userId,
      applicantEmail: this.user?.email,
      sentDate: new Date(),
      deadline: new Date(
        Date.now() + assignmentDetails.deadlineDays * 24 * 60 * 60 * 1000
      ),
    };

    this.jobPostingService.sendAssignment(assignment).subscribe(
      (response) => {
        this.jobApplication.status = 'assignment_sent';
        this.toastr.success('Assignment sent successfully');
      },
      (error) => {
        this.toastr.error('Error sending assignment');
      }
    );
  }

  closeAIAnalysisModal(): void {
    this.isAIAnalysisModalOpen = false;
  }

  // openAIAnalysisModal(): void {
  //   this.isAIAnalysisModalOpen = true;
  //   this.isAnalyzing = true;
  //   this.jobPostingService.analyzeApplication(this.applicationId).subscribe(
  //     (results: any) => {
  //       this.aiAnalysisResults = results;
  //       this.isAnalyzing = false;
  //     },
  //     (error: any) => {
  //       this.toastr.error('Error analyzing application');
  //       this.isAnalyzing = false;
  //     }
  //   );
  // }
 openAIAnalysisModal(candidate: any): void {
  this.isAIAnalysisModalOpen = true;
  this.isAnalyzing = true;
  this.aiAnalysisResults = null;

  // Call the AI analysis API with credentials
  this.http
    .post<AIAnalysisResults>(
      `${this.url}/api/user/ai-analyze`,
      {
        jobId: this.jobId,
        userId: this.userId,
      },
      {
        withCredentials: true, // ✅ Send cookies / credentials
      }
    )
    .subscribe({
      next: (results) => {
        this.aiAnalysisResults = results;
        this.isAnalyzing = false;
      },
      error: (error) => {
        console.error('Error performing AI analysis:', error);
        this.isAnalyzing = false;
        this.toastr.error('Error analyzing application');
      },
    });
}


  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  retry(): void {
    this.loading = true;
    this.errorMessage = '';
    if (this.jobId && this.userId) {
      this.fetchJobApplication();
      this.fetchUserDetails();
      this.fetchJobDetails();
    }
  }

  downloadUserProfile(): void {
    // Navigate to profile or trigger download
    // For now, we'll just show a toast
    this.toastr.info('Profile download feature coming soon');
  }

  trackByCommentId(index: number, comment: Comment): string {
    return comment.id || index.toString();
  }

  deleteComment(commentId: string): void {
    this.http
      .delete(`${this.url}/api/job-applications/${this.applicationId}/comments/${commentId}`)
      .subscribe(
        () => {
          this.comments = this.comments.filter(c => c.id !== commentId);
          this.toastr.success('Comment deleted successfully');
        },
        (error) => {
          this.toastr.error('Error deleting comment');
          console.error('Error deleting comment:', error);
        }
      );
  }

  getStatusVariant(status: string): string {
    const variants: { [key: string]: string } = {
      'pending': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'interviewing': 'bg-blue-50 text-blue-700 border-blue-200',
      'shortlisted': 'bg-green-50 text-green-700 border-green-200',
      'rejected': 'bg-red-50 text-red-700 border-red-200',
      'assignment_sent': 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return variants[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  }

  getTimeAgo(date: Date | string): string {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return then.toLocaleDateString();
  }

  getAnswerOptions(answer: string | string[]): string[] {
    if (Array.isArray(answer)) {
      return answer;
    }
    if (typeof answer === 'string' && answer.includes(',')) {
      return answer.split(',').map(a => a.trim());
    }
    return [answer];
  }

  getCandidateUserId(): string {
    if (this.userId) {
      
      return this.userId;
      
    }
    if (this.jobApplication?.user) {
      if (typeof this.jobApplication.user === 'string') {
        return this.jobApplication.user;
      }
      console.log('jobApplication.user',this.jobApplication.user);
      return this.jobApplication.user._id || this.jobApplication.user.id || '';
    }
    return '';
  }

  toggleProfile(): void {
    this.showFullProfile = !this.showFullProfile;
  }

  toggleCover(): void {
    this.showFullCover = !this.showFullCover;
  }

  toggleQuestion(index: number): void {
    this.expandedQuestions[index] = !this.expandedQuestions[index];
  }
}
