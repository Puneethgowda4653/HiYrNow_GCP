import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { userDetails } from '../../models/userDetails.model.client';
import { ResumeUploadService } from '../../services/resume-upload.service';
import { JobPostingService } from '../../services/job-posting.service';
@Component({
  selector: 'app-user-detsils',
  standalone: true,
  imports: [],
  templateUrl: './user-detsils.component.html',
  styleUrl: './user-detsils.component.css'
})
export class UserDetsilsComponent {
  userId!: string;
  user: userDetails['user'] | undefined;
  experiences: userDetails['experiences'] = [];
  education: userDetails['education'] = [];
  skills: userDetails['skill'] = [];
  projects: userDetails['project'] = [];
  resume:any[] = [];
  jobApplication: any;
  jobId!: string;
  errorMessage!: string;
  // faGithub = faGithub;
  // faLinkedin = faLinkedin;
  // faFacebook = faFacebook;
  // faTwitter = faTwitter;
  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private resumeUploadService: ResumeUploadService,
    private jobPosting: JobPostingService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.userId = params.get('userId')!;
      this.fetchUserDetails();

      this.jobId = this.route.snapshot.paramMap.get('jobId') || ''; // Provide fallback for null
      this.userId = this.route.snapshot.paramMap.get('userId') || ''; // Provide fallback for null
  
      if (this.jobId && this.userId) {
        this.getJobApplication();
      } else {
        this.errorMessage = 'Job ID or User ID is missing.';
      }
    });
  }
  getJobApplication(): void {
    this.jobPosting.getJobApplicationByJobIdAndUserId(this.jobId, this.userId)
      .subscribe(
        (data) => {
          this.jobApplication = data;
        },
        (error) => {
          this.errorMessage = 'Error fetching job application: ' + error.message;
        }
      );
  }

  fetchUserDetails(): void {
    
    this.userService.getUserResume(this.userId).subscribe(
      (response: any[]) => {
        if (response.length > 0) {
          const latestFile = response[response.length - 1];
          this.resume = [{
            filename: latestFile.filename,
            originalname: latestFile.originalname,
            contentType: latestFile.contentType
          }];
          // this.filesExist = true;
        } else {
          this.resume = [];
          // this.filesExist = false;
        }
      },
      error => {
        console.error('Error fetching file names:', error);
      }
    );
  
    this.userService.getUserDetails(this.userId).subscribe(
      (data: userDetails) => {
        this.user = data.user;
        this.experiences = data.experiences || [];
        this.education = data.education || [];
        this.skills = data.skill || [];
        this.projects = data.project || [];
      },
      (error: any) => {
        console.error('Error fetching user details:', error);
      }
    );
  
  }


  downloadPdf(filename: string, contentType: string ,) {
    this.userService.downloadPDF(filename ,this.userId).subscribe(
      (res: Blob) => {
        const file = new Blob([res], { type: contentType });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL);
      },
      error => {
        console.error('Error downloading PDF:', error);
      }
    );
  }
  // getSocialIcon(socialType: string) {
  //   switch (socialType.toLowerCase()) {
  //     case 'github': return this.faGithub;
  //     case 'linkedin': return this.faLinkedin;
  //     case 'facebook': return this.faFacebook;
  //     case 'twitter': return this.faTwitter;
  //     default: return null;
  //   }
  // }
  
}

