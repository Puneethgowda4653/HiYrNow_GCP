import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobListingService } from '../../services/job-listing.service';
import { SaveJobService } from '../../services/save-job.service';
import { UserService } from '../../services/user.service';
import { JobPostingService } from '../../services/job-posting.service';
import { JobPostingModelClient } from '../../models/job-posting.model.client';
import { HttpClient } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-view-job',
  templateUrl: './view-job.component.html',
  styleUrls: ['./view-job.component.css'],
})
export class ViewJobComponent implements OnInit {
  loading: boolean = false;

  filters = {
    score: '',
    name: '',
    email: '',
    phone: '',
    username: '',
  };
  @Input() job: JobPostingModelClient = new JobPostingModelClient();
  @Input() jobIdInput: string | null = null; // Accept jobId as input
  jobId!: string;

  showMore: boolean = false;
  @Input() user: any;
  jobSource!: string;
  jobApplications: any[] = [];
  alreadySavedCheck = false;
  alreadyAppliedCheck = false;
  postings: JobPostingModelClient[] = [];
  isMainDivVisible = false;
  isSecondaryDivVisible = false;
  sAddMode = false;
  rAddMode = false;
  qAddMode = false;
  skillsRequired: string[] = [];
  skill = '';
  responsibilities: string = '';
  responsibility: string = '';
  description: string = '';
  minQualifications: string[] = [];
  qualification = '';
  jobApplicationId: any;
  pvcListUsers: any;
  showAppliedUsers: boolean = true; // Default to show applied users
  isModalOpen: boolean = false;
  coverLetter: string = '';
  currentUrl: string = '';
  loginButton: boolean = false;
  matchedUsers: any[] = [];
  selectedView: string = 'appliedUsers';
  applicationStatus: string = '';
  url: any;

  constructor(
    private jobService: JobListingService,
    private route: ActivatedRoute,
    private saveJobService: SaveJobService,
    private userService: UserService,
    private jobPosting: JobPostingService,
    private http: HttpClient,
    private router: Router,
    private metaService: Meta,
    private titleService: Title
  ) {}
  ngOnInit() {
    // Determine jobId from input or route
    this.jobId = this.jobIdInput || this.route.snapshot.paramMap.get('jobId') || this.route.snapshot.paramMap.get('id')!;

    if (this.jobId) {
      const base = location.toString().includes('localhost')
        ? 'environment.apiUrl'
        : environment.apiUrl;

      this.url = base;

      // Fetch job details
      this.jobPosting
        .getJobPostingById(this.jobId)
        .subscribe((jobDetails: JobPostingModelClient) => {
          this.job = jobDetails;
          this.jobSource = jobDetails.jobSource;

          this.updateMetaTags();
        });
    }

    // Initialize additional details
    this.currentUrl = `https://hiyrnow.in${this.router.url}`;
    this.userService.findLoggedUser().then((user) => {
      this.user = user;
      this.loginButton = true;
      if (user && user.role === 'JobSeeker') {
    this.getJobApplication();
  }
    });
  }
  get twitterShareUrl(): string {
    const text =
      `🌟 Job Opening: ${this.job.title} at ${this.job.company}\n` +
      `🏢 Company: ${this.job.company}\n` +
      `📍 Location: ${this.job.location}\n` +
      `#Hiring #JobOpportunity #${this.job.company.replace(/\s+/g, '')} ` +
      `#${this.job.title.replace(/\s+/g, '')} ` +
      this.job.coreSkills
        .map((skill: any) => `#${skill.name.replace(/\s+/g, '')}`)
        .join(' ');
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      this.currentUrl
    )}&text=${encodeURIComponent(text)}`;
  }

  get linkedInShareUrl(): string {
    const title = `Job Opening: ${this.job.title} at ${this.job.company}`;
    const summary =
      `🌟 Job Opening: ${this.job.title} at ${this.job.company}\n` +
      `🏢 Company: ${this.job.company}\n` +
      `📍 Location: ${this.job.location}\n` +
      `#Hiring #JobOpportunity #${this.job.company.replace(/\s+/g, '')} ` +
      `#${this.job.title.replace(/\s+/g, '')} ` +
      this.job.coreSkills
        .map((skill: any) => `#${skill.name.replace(/\s+/g, '')}`)
        .join(' ');
    return `https://www.linkedin.com/feed/?linkOrigin=LI_BADGE&shareActive=true&shareUrl=${encodeURIComponent(
      this.currentUrl
    )}&title=${encodeURIComponent(title)}&text=${encodeURIComponent(summary)}`;
  }

  get facebookShareUrl(): string {
    const quote = `🌟 Exciting Job Opportunity!\nJob: ${this.job.title} at ${
      this.job.company
    }\nLocation: ${this.job.location}\nKey Skills: ${this.job.coreSkills
      .map((skill: any) => skill.name)
      .join(', ')}`;
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      this.currentUrl
    )}&quote=${encodeURIComponent(quote)}`;
  }

  get whatsappShareUrl(): string {
    const text =
      `🌟 Job Opening: ${this.job.title} at ${this.job.company}\n` +
      ` 🏢 Company: ${this.job.company}\n ` +
      `📍 Location: ${this.job.location}\n` +
      `🔑 Key Skills: ${this.job.coreSkills
        .map((skill: any) => skill.name)
        .join(', ')}\n\n` +
      ` Check out the full job details: ${this.currentUrl}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  // filteredUsers() {
  //     return this.matchedUsers.filter(match => {
  //       const fullName = `${match.user.firstName} ${match.user.lastName}`.toLowerCase();
  //       return (
  //         (!this.filters.score || match.score >= parseInt(this.filters.score)) &&
  //         (!this.filters.name || fullName.includes(this.filters.name.toLowerCase())) &&
  //         (!this.filters.email || match.user.email.toLowerCase().includes(this.filters.email.toLowerCase())) &&
  //         (!this.filters.phone || match.user.phone.includes(this.filters.phone)) &&
  //         (!this.filters.username || match.user.username.toLowerCase().includes(this.filters.username.toLowerCase()))
  //       );
  //     });
  //   }

  // fetchMatchedUsers(id: string) {
  //   this.loading = true;
  //   this.http.get<any>(`${this.url}/api/jobPosting/${id}/matchUsersWithScore`).subscribe(
  //    (response) => {
  //       this.matchedUsers = response.topMatches;
  //       this.loading = false;
  //     },
  //     (error) => {
  //       console.error('Error fetching matched users', error);
  //       this.loading = false;
  //     }
  //   );
  // }
  updateMetaTags(): void {
    if (this.job?.title && this.job?.description) {
      const jobTitle = `${this.job.title} - hiyrnow`;
      const jobDescription = this.job.description;
      const jobImageUrl = 'https://hiyrnow.in/assets/hiyrnow_logo.png';

      // Update the browser title
      this.titleService.setTitle(jobTitle);

      // Update standard meta tags
      this.metaService.updateTag({
        name: 'description',
        content: jobDescription,
      });

      // Update Open Graph (OG) meta tags
      this.metaService.updateTag({ property: 'og:title', content: jobTitle });
      this.metaService.updateTag({
        property: 'og:description',
        content: jobDescription,
      });
      this.metaService.updateTag({
        property: 'og:image',
        content: jobImageUrl,
      });
      this.metaService.updateTag({
        property: 'og:url',
        content: this.currentUrl,
      });
      this.metaService.updateTag({ property: 'og:type', content: 'article' });

      // Update Twitter meta tags
      this.metaService.updateTag({
        name: 'twitter:card',
        content: 'summary_large_image',
      });
      this.metaService.updateTag({ name: 'twitter:title', content: jobTitle });
      this.metaService.updateTag({
        name: 'twitter:description',
        content: jobDescription,
      });
      this.metaService.updateTag({
        name: 'twitter:image',
        content: jobImageUrl,
      });
    }
  }

  private initializeJobDetails() {
    if (this.jobId != null) {
      this.jobService.findAllJobs().subscribe((jobs: any) => {
        const matchingJob = jobs.find(
          (job: JobPostingModelClient) => job.id === this.jobId
        );
        if (matchingJob) {
          const d = new Date(matchingJob.created_at);
          this.job = matchingJob;
          this.job.jobSource = this.jobSource;
          this.job.created_at = d.toDateString();
        }

        this.jobPosting.getAllJobPostings().subscribe((postings) => {
          this.postings = postings;
          for (const posting of this.postings) {
            if (posting['_id'] === this.jobId) {
              this.job = posting;
              this.job.jobSource = this.jobSource;
              this.job.datePosted = new Date(posting['datePosted']);
            }
          }

          this.userService.findLoggedUser().then((user) => {
            this.user = user;
            this.getJobApplication();
          });
        });
      });
    }
  }
  openModal() {
    this.isModalOpen = true;
  }
  closeModal() {
    this.isModalOpen = false;
  }
  getJobApplication() {
    this.saveJobService
      .getAllJobApplicationForUser()
      .then((jobApplications) => {
        if (
          jobApplications.status != null &&
          jobApplications.status === 'session expired'
        ) {
          this.jobApplications = [];
        } else {
          this.jobApplications = jobApplications;
        }
      })
      .then(() => {
        this.jobApplications.forEach((jobApp) => {
          if (
            (this.jobSource === 'github' &&
              jobApp['gitHubJobId'] === this.jobId) ||
            (this.jobSource !== 'github' && jobApp['jobPosting'] === this.jobId)
          ) {
            if (jobApp['status'] === 'save') {
              this.alreadySavedCheck = true;
            } else {
              this.alreadyAppliedCheck = true;
            }
          }
        });
      });
  }

  getAppliedUsersForJob() {
    this.saveJobService
      .getAppliedUsersForJob(this.jobId, this.jobSource)
      .then((response) => {
        const appliedUsers = response.appliedUsers; // Extract the appliedUsers array
        if (Array.isArray(appliedUsers) && appliedUsers.length > 0) {
          this.jobApplications = appliedUsers; // Update jobApplications here

          // Logging the job applications for debugging

          // Iterate through the applied users to log individual user details
          appliedUsers.forEach((user) => {
            this.jobApplicationId = user.applicationId;
            this.applicationStatus = user.application.status;
          });
        } else {
          console.log('No applied users found.');
        }
      })
      .catch((error) => {
        console.error('Error fetching applied users:', error);
      });
  }

  saveJobId(job: {
    jobSource: string;
    id: any;
    location: any;
    title: any;
    company: any;
    _id: any;
  }) {
    let jobApplication;
    if (job.jobSource === 'github') {
      jobApplication = {
        dateApplied: new Date(),
        status: 'save',
        jobSource: job.jobSource,
        gitHubJobId: job.id,
        location: job.location,
        title: job.title,
        company: job.company,
      };
    } else {
      jobApplication = {
        dateApplied: new Date(),
        status: 'save',
        jobSource: job.jobSource,
        jobPosting: job._id,
        location: job.location,
        title: job.title,
        company: job.company,
      };
    }

    this.alreadySavedCheck = false;
    this.alreadyAppliedCheck = false;

    this.saveJobService
      .createJobApplication(jobApplication)
      .then(() => this.getJobApplication());
  }

  deleteJobId(job: { jobSource: string; id: any; _id: any }) {
    this.alreadySavedCheck = false;
    this.alreadyAppliedCheck = false;
    let id;
    if (job.jobSource === 'github') {
      id = job.id;
    } else {
      id = job._id;
    }
    this.saveJobService
      .deleteJobApplicationByJobPosting(id, job.jobSource)
      .then(() => this.getJobApplication());
  }

  // applyJob(job: { jobSource: string; id: any; location: any; title: any; company: any; _id: any; }) {
  //   let jobApplication: {
  //     dateApplied: Date; status: string; jobSource: any; gitHubJobId: any; location: any; title: any; company: any; jobPosting?: undefined; coverLetter:string;
  //   } | {
  //     dateApplied: Date; status: string; jobSource: any; jobPosting: any; location: any; title: any; company: any; gitHubJobId?: undefined;
  //   };
  //   if (job.jobSource === 'github') {
  //     jobApplication = {
  //       dateApplied: new Date(), status: 'applied', jobSource: job.jobSource, gitHubJobId: job.id,
  //       location: job.location, title: job.title, company: job.company ,  coverLetter: this.coverLetter
  //     };
  //   } else {
  //     jobApplication = {
  //       dateApplied: new Date(), status: 'applied', jobSource: job.jobSource, jobPosting: job._id,
  //       location: job.location, title: job.title, company: job.company , coverLetter: this.coverLetter
  //     };
  //   }

  //   let id;
  //   if (job.jobSource === 'github') {
  //     id = job.id;
  //   } else {
  //     id = job._id;
  //   }
  //   console.log("job appli 225",jobApplication)

  //   this.alreadySavedCheck = false;
  //   this.alreadyAppliedCheck = false;
  //   // this.saveJobService.deleteJobApplicationByJobPosting(id, job.jobSource).then(() =>
  //     this.saveJobService.createJobApplication(jobApplication).then(() => this.getJobApplication());
  // }

  applyJob(event: { customQuestions: any; coverLetter: string }) {
    // Process custom questions and answers
    const customQuestionsWithAnswers =
      this.job.customQuestions?.map((question: any, index: number) => ({
        question: question.question,
        answerType: question.answerType,
        required: question.required,
        options: question.options || null, // For multiple choice questions
        answer: event.customQuestions[index] || '',
      })) || [];

    const jobApplication = {
      dateApplied: new Date(),
      status: 'applied',
      jobSource: this.job.jobSource,
      jobPosting: this.job._id,
      location: this.job.location,
      title: this.job.title,
      company: this.job.company,
      coverLetter: event.coverLetter,
      customQuestions: customQuestionsWithAnswers, // Add custom questions and answers
    };

    this.alreadySavedCheck = false;
    this.alreadyAppliedCheck = false;

    this.saveJobService
      .createJobApplication(jobApplication)
      .then(() => this.getJobApplication());
  }

  toggleRAddMode() {
    this.rAddMode = !this.rAddMode;
  }

  toggleSAddMode() {
    this.sAddMode = !this.sAddMode;
  }
  toggleQAddMode() {
    this.qAddMode = !this.qAddMode;
  }
  cancelAddR() {
    this.toggleRAddMode();
  }

  cancelAddS() {
    this.toggleSAddMode();
  }

  cancelAddQ() {
    this.toggleQAddMode();
  }

  updateJob(id: string, job: any) {
    this.jobPosting
      .updateJobPosting(id, job)
      .then(() => this.getJobApplication());
  }

  // moveToPVC(userId: string) {
  //   const payload = { userId: userId };
  //   this.http
  //     .put(
  //       `${this.url}/jobApplication/${this.jobApplicationId}/moveToPVC`,
  //       payload
  //     )
  //     .subscribe(
  //       (response: any) => {
  //         console.log('User moved to PVC list', response);
  //         // Optionally, refresh the list of job applications or handle UI changes
  //       },
  //       (error: any) => {
  //         console.error('Error moving user to PVC list', error);
  //       }
  //     );
  // }

  // getPVCListUsers() {
  //   this.http.get(`${this.url}/pvcList/${this.jobId}`).subscribe(
  //     (users: any) => {
  //       this.pvcListUsers = users;
  //       console.log('PVC list users:', this.pvcListUsers);
  //     },
  //     (error: any) => {
  //       console.error('Error fetching PVC list users', error);
  //     }
  //   );
  // }
}
