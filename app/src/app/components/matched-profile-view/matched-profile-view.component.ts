import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { userDetails } from '../../models/userDetails.model.client';
import { UserService } from '../../services/user.service';
import { JobPostingService } from '../../services/job-posting.service';
import { ToastrService } from 'ngx-toastr';
import { fadeIn, fadeInUp, fadeInDown, scaleIn, slideInLeft } from '../../shared/animations';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-matched-profile-view',
  templateUrl: `./matched-profile-view.component.html`,
  styleUrls: ['./matched-profile-view.component.css'],
  animations: [fadeIn, fadeInUp, fadeInDown, scaleIn, slideInLeft]
})
export class MatchedProfileViewComponent implements OnInit {
  jobId: string | null;
  userId: string = '';
  user: userDetails['user'] | undefined;
  loading = true;
  error: string | null = null;
  url: any;
  resume: any[] = [];
  jobDetails: any = null;
  isAIAnalysisModalOpen: boolean = false;
  isAnalyzing: boolean = false;
  aiAnalysisResults: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private userService: UserService,
    private jobPostingService: JobPostingService,
    private toastr: ToastrService
  ) {
    this.jobId = this.route.snapshot.paramMap.get('jobId');
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    
    this.url = environment.apiUrl;
  }

  ngOnInit(): void {
    this.fetchUserDetails();
    if (this.jobId) {
      this.fetchJobDetails();
    }
  }

  fetchUserDetails(): void {
    if (!this.userId) {
      this.error = 'User ID is missing';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    this.userService.getUserDetails(this.userId, 'viewprofile').subscribe({
      next: (data: userDetails) => {
        this.user = data.user;
        this.fetchUserResume();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error fetching user details:', error);
        this.error = 'Failed to fetch user details';
        this.loading = false;
      },
    });
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

  sendJobDescription() {
    if (!this.jobId || !this.user?.email) {
      console.error('Missing jobId or user email');
      return;
    }

    const payload = {
      email: this.user.email,
      jobLink: `https://hiyrnow.in/job/${this.jobId}`,
    };

    this.loading = true;
    let base;
    if (!location.toString().includes('localhost')) {
      base = 'https://hiyrnow-v1-721026586154.europe-west1.run.app';
      // environment.apiUrl
    } else {
      base = environment.apiUrl;
    }
    this.url = base;
    this.http.post(this.url + '/api/job-description/send', payload).subscribe({
      next: (response) => {
        console.log('Job description sent successfully');
        this.loading = false;
        // TODO: Add success notification here
      },
      error: (error) => {
        console.error('Error sending job description:', error);
        this.loading = false;
        this.error = 'Failed to send job description';
        // TODO: Add error notification here
      },
    });
  }

  fetchJobDetails(): void {
    if (!this.jobId) return;
    this.jobPostingService.getJobPostingById(this.jobId).subscribe(
      (data) => {
        this.jobDetails = data;
      },
      (error) => {
        console.error('Error fetching job details:', error);
      }
    );
  }

  downloadUserProfile(): void {
    // Navigate to profile or trigger download
    this.toastr.info('Profile download feature coming soon');
  }

  openAIAnalysisModal(): void {
    this.isAIAnalysisModalOpen = true;
    this.isAnalyzing = true;
    this.aiAnalysisResults = null;

    // Call the AI analysis API with credentials
    this.http
      .post<any>(
        `${this.url}/api/user/ai-analyze`,
        {
          jobId: this.jobId,
          userId: this.userId,
        },
        {
          withCredentials: true,
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
          this.toastr.error('Error analyzing profile');
        },
      });
  }

  closeAIAnalysisModal(): void {
    this.isAIAnalysisModalOpen = false;
  }

  retry(): void {
    this.loading = true;
    this.error = null;
    this.fetchUserDetails();
    if (this.jobId) {
      this.fetchJobDetails();
    }
  }

  shareProfile(platform: 'linkedin' | 'twitter' | 'whatsapp') {
    if (!this.userId) {
      console.error('User ID is required for sharing');
      return;
    }

    const profileUrl = `https://hiyrnow.in/profile-seeker/${this.userId}`;
    let shareUrl = '';

    switch (platform) {
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
          profileUrl
        )}&text=${encodeURIComponent('Check out this profile!')}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(
          `Check out this profile: ${profileUrl}`
        )}`;
        break;
    }

    // Open share dialog in a new window
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }

  contactCandidate(): void {
    if (this.user?.email) {
      window.location.href = `mailto:${this.user.email}`;
    } else {
      this.toastr.warning('Email not available for this candidate');
    }
  }
}
