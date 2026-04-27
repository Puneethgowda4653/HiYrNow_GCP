import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { RecruiterDetailService } from '../../services/recruiter-detail.service';
import { Router } from '@angular/router'; 
import { ShareModalComponent } from '../share-modal/share-modal.component';
@Component({
  selector: 'app-user-sidebar',
  templateUrl: './user-sidebar.component.html',
  styleUrls: ['./user-sidebar.component.css']
})
export class UserSidebarComponent implements OnInit {
  @ViewChild(ShareModalComponent) shareModal!: ShareModalComponent;
  isProfilePicModalOpen = true;
  profilePicUrl!: string;
  profilePicExist = false;
  imageUrl = 'https://static.vecteezy.com/system/resources/thumbnails/009/734/564/small/default-avatar-profile-icon-of-social-media-user-vector.jpg';
  isJobSeeking = true;
  user: any;
  connections=2;
  experience="";
  userId: string = '';
  isCurrentUser: boolean = false;
  firstName = 'firstName';
  lastName = 'lastName';
  tagline = '';
  facebook = '';
  linkedin = '';
  github = '';
  twitter = '';
  socialContact: any[] = [];
  editMode = false;
  toastr: any;
  isEditBioModalOpen: boolean = false;
  dropdownOpen: boolean = false;
  matchedJobs: any[] = [];
  recruiter: any;
  updateId = '';
  updateCompanyId = '';
  username = '';
  password = '';
 
  title = '';
  company = '';
  companyName = '';
  companyWebsite = '';
  industry = '';
  location = '';
  aboutCompany = '';
  companyMission = '';
  coreValues = '';
  employeeBenefits = '';
  numberOfEmployees: number | undefined;
  yearEstablished: number | undefined;
  userProfileLink: string | undefined;
  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private recruiterService: RecruiterDetailService
  ) { }

  ngOnInit() {
    // First check if there's a user ID in the URL
    this.route.params.subscribe(params => {
      const urlUserId = params['userId'];
      
      // If URL has no userId, get logged-in user
      if (!urlUserId) {
        this.loadLoggedInUserData();
      } else {
        // Load specific user data from URL parameter
        this.loadUserData(urlUserId);
      }
    });
  }

  private loadLoggedInUserData() {
    this.userService.findLoggedUser()
      .then(user => {
        this.user = user;
        this.userId = user._id;
        this.isCurrentUser = true;
        this.userProfileLink = `${window.location.origin}/profile-seeker/${this.userId}`;
        this.updateUserInfo(user);
      })
      .catch(error => console.error('Error fetching logged-in user data:', error));
  }


  toggleStatus() {
    this.isJobSeeking = !this.isJobSeeking;
    // Here you would typically update the backend
    // this.userService.updateJobSeekingStatus(this.isJobSeeking).subscribe();
  }

  private loadUserData(userId: string) {
    this.userService.getUserProfileById(userId)  // Ensure this returns an Observable
      .subscribe(
        (user: any) => {
          this.user = user;
          this.userId = userId;
          this.isCurrentUser = false;
          this.updateUserInfo(user);
        },
        (error: any) => console.error('Error fetching user data:', error)
      );
  }
  onTaglineChange(value: string): void {
    this.tagline = value.substring(0, 200); // Ensure it doesn't exceed 200 characters
  }

  private updateUserInfo(user: any) {
    if (user) {
      this.firstName = user.firstName ?? this.firstName;
      this.lastName = user.lastName ?? this.lastName;
      this.tagline = user.tagline ?? this.tagline;
      this.socialContact = user.socialContact ?? [];
      // Load profile picture
      this.loadProfilePic(user._id);
      this.profilePicUrl = user.profilePicUrl ?? this.imageUrl;
      this.profilePicExist = !!user.profilePicUrl;
      // Only fetch company details if it's a recruiter
      if (user.role === "Recruiter") {
        this.loadRecruiterDetails();
      }
    }
  }

  private loadRecruiterDetails() {
    this.recruiterService.findRecruiterDetailsByUserId()  // Update method to accept userId parameter
      .then(company => {
       
        this.updateCompanyId = company._id;
        this.title = company.title ?? '';
        this.company = company.company ?? '';
        this.companyName = company.username ?? '';
        this.companyWebsite = company.companyWebsite ?? '';
        this.industry = company.industry ?? '';
        this.location = company.location ?? '';
        this.aboutCompany = company.aboutCompany ?? '';
        this.numberOfEmployees = company.numberOfEmployees ?? '';
        this.yearEstablished = company.yearEstablished ?? '';
        this.companyMission = company.companyMission ?? '';
        this.coreValues = company.coreValues ?? '';
        this.employeeBenefits = company.employeeBenefits ?? '';
      })
      .catch(error => console.error('Error fetching company data:', error));
  }

  onProfilePicSelected(event: any) {
    // Only allow profile pic updates for current user
    if (!this.isCurrentUser) return;

    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('profilePic', file, file.name);
      formData.append('userId', this.userId);

      this.userService.uploadProfilePic(formData).subscribe(
        response => {
          if (response.file_uploaded) {
            this.profilePicUrl = response.profilePicUrl;
            this.profilePicExist = true;
            this.closeProfilePicModal();
            alert("uploaded successfully");
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        },
        error => console.error('Error uploading file:', error)
      );
    }
  }

  droppedProfilePic(files: NgxFileDropEntry[]) {
    // Only allow profile pic updates for current user
    if (!this.isCurrentUser) return;

    for (const droppedFile of files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          const formData = new FormData();
          formData.append('profilePic', file, file.name);
          formData.append('userId', this.userId);

          this.userService.uploadProfilePic(formData).subscribe(
            response => {
              if (response.file_uploaded) {
                this.profilePicUrl = response.profilePicUrl;
                this.profilePicExist = true;
                this.closeProfilePicModal();
                alert("uploaded successfully");
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            },
            error => console.error('Error uploading file:', error)
          );
        });
      }
    }
  }

  loadProfilePic(userId: string): void {
    this.userService.getProfilePic(userId).subscribe(
      (data: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.profilePicUrl = reader.result as string;
          this.profilePicExist = true;
        };
        reader.readAsDataURL(data);
      },
      error => console.error('Error fetching profile picture:', error)
    );
  }

  saveBio() {
    // Only allow bio updates for current user
    if (!this.isCurrentUser) return;

    const updateduser = {
      'tagline': this.tagline,
    };
    this.isEditBioModalOpen = false;
    this.userService.updateUserProfile(updateduser)
      .then((updatedUser) => {
        console.log('Update success');
        window.location.reload();
      });
  }

  // UI helper methods
  editBio() {
    if (this.isCurrentUser) {
      this.editMode = true;
    }
  }

  cancel() {
    this.editMode = false;
    this.isEditBioModalOpen = false;
  }

  openProfilePicModal() {
    if (this.isCurrentUser) {
      this.isProfilePicModalOpen = true;
      this.dropdownOpen = false;
    }
  }

  toggleDropdown() {
    if (this.isCurrentUser) {
      this.dropdownOpen = !this.dropdownOpen;
    }
  }

  openEditBioModal() {
    if (this.isCurrentUser) {
      this.isEditBioModalOpen = true;
      this.dropdownOpen = false;
    }
  }

  closeEditBioModal() {
    this.isEditBioModalOpen = false;
  }

  closeProfilePicModal() {
    this.isProfilePicModalOpen = false;
  }

  checkHidden(url: string): boolean {
    return !url;
  }

  shareProfile(): void {
    this.shareModal.openShareModal();
  }
}