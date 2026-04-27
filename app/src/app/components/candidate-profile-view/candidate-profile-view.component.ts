import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { userDetails } from '../../models/userDetails.model.client';

@Component({
  selector: 'app-candidate-profile-view',
  templateUrl: './candidate-profile-view.component.html',
  styleUrls: ['./candidate-profile-view.component.css']
})
export class CandidateProfileViewComponent implements OnInit, OnChanges {
  @Input() userId: string = '';
  @Input() jobId: string | null = null;
  @Input() showActions: boolean = true;
  @Input() showBackButton: boolean = true;
  @Input() backRoute: string = '/company/job-postings';

  user: userDetails['user'] | undefined;
  loading = true;
  error: string | null = null;
  resume: any[] = [];
  defaultProfilePicUrl: string = '../../../assets/defaultUser.jpg';
  profilePicUrl: string = '';

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.userId) {
      this.fetchUserDetails();
    } else {
      this.loading = false;
      // Don't set error immediately, wait for userId to be provided
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Watch for userId changes and fetch data when it becomes available
    if (changes['userId'] && !changes['userId'].firstChange) {
      const newUserId = changes['userId'].currentValue;
      if (newUserId && newUserId !== changes['userId'].previousValue) {
        this.fetchUserDetails();
      }
    } else if (changes['userId'] && changes['userId'].firstChange && this.userId) {
      // If userId is provided on first change, fetch data
      this.fetchUserDetails();
    }
  }

  fetchUserDetails(): void {
    this.loading = true;
    this.error = null;
    // console.log('@@@@@@@@@fetchUserDetails@@@@@@@@@',this.userId);
    this.userService.getUserDetails(this.userId, 'viewprofile').subscribe({
      next: (response: any) => {
        // console.log('@@@@@@@@@data@@@@@@@@@',response);
        if (response.status === 'success' && response.data) {
          this.user = response.data.user;
          this.fetchUserResume();
          this.loadProfilePicture();
          this.loading = false;
        } else {
          console.error('Unexpected response structure:', response);
          this.error = 'Invalid response format';
          this.loading = false;
        }
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

  loadProfilePicture(): void {
    if (this.userId) {
      this.userService.getProfilePic(this.userId).subscribe({
        next: (data: Blob) => {
          if (data && data.size > 0) {
            const reader = new FileReader();
            reader.onload = () => {
              this.profilePicUrl = reader.result as string;
            };
            reader.readAsDataURL(data);
          } else {
            this.profilePicUrl = this.defaultProfilePicUrl;
          }
        },
        error: () => {
          this.profilePicUrl = this.defaultProfilePicUrl;
        },
      });
    }
  }

  downloadResume(filename: string, contentType: string): void {
    this.userService.downloadPDF(filename, this.userId).subscribe(
      (res: Blob) => {
        const file = new Blob([res], { type: contentType });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL);
      },
      (error) => {
        console.error('Error downloading resume:', error);
      }
    );
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName && !lastName) return '??';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '??';
  }
}

