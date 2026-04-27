import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { UserService } from '../../services/user.service';
import { RecruiterDetailService } from '../../services/recruiter-detail.service';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fadeIn, fadeInUp, scaleIn, slideToggle } from '../../shared/animations';
import { ToastrService } from 'ngx-toastr';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
interface SocialMedia {
  icon:
  | 'linkedin'
  | 'twitter'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'tiktok';
  url: string;
}

interface TeamMember {
  name: string;
  position: string;
  avatar: string;
  bio: string;
  socialLinks: SocialMedia[];
}

interface JobFilter {
  label: string;
  value: string;
}

interface Job {
  title: string;
  type: string;
  department: string;
  location: string;
  postedDate: string;
  skills: string[];
}

interface Company {
  name: string;
  logo: string;
  banner: string;
  tagline: string;
  website: string;
  industry: string;
  founded: string;
  size: string;
  location: string;
  description: string;
  mission: string;
  employeeBenefits: string;
  socialMedia: SocialMedia[];
  address: string;
  phone: string;
  email: string;
  // Added properties to match template usage
  isVerified?: boolean;
  isHiring?: boolean;
  employeeCount?: number | string;
  specialties?: string[];
}

interface User {
  _id: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  requestStatus: string;
  socialContact: Array<{ socialtype: string; url: string }>;
  coverPhotoUrl?: string;  // ✅ ADD THIS LINE
}

interface RecruiterDetail {
  _id: string;
  title: string;
  company: string;
  companyWebsite: string;
  industry: string;
  location: string;
  aboutCompany: string;
  numberOfEmployees: string;
  yearEstablished: string;
  companyMission: string;
  coreValues: string;
  employeeBenefits: string;
  productsServices: string[];
  teamMembers: TeamMember[];
  tagline?: string;
  vision?: string;
  overallRating?: number;
  totalReviews?: number;
  socialMedia?: SocialMedia[];
  address?: string;
  phone?: string;
  email?: string;
}

@Component({
  selector: 'app-profile-recruiter',
  templateUrl: './profile-recruiter.component.html',
  styleUrls: ['./profile-recruiter.component.css'],
  animations: [fadeIn, fadeInUp, scaleIn, slideToggle]
})
export class ProfileRecruiterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  user: User | null = null;
  isProfilePicModalOpen = false;
  recruiter: RecruiterDetail | null = null;
  isCurrentUser = false;
  updateId = '';
  updateCompanyId = '';
  userId = '';
  username = '';
  password = '';
  firstName = '';
  lastName = '';
  title = '';
  company: Company = {
    name: '',
    logo: '',
    banner: '',
    tagline: '',
    website: '',
    industry: '',
    founded: '',
    size: '',
    location: '',
    description: '',
    mission: '',
    employeeBenefits: '',
    socialMedia: [
      { icon: 'linkedin', url: '' },
      { icon: 'twitter', url: '' },
      { icon: 'instagram', url: '' },
    ],
    address: '',
    phone: '',
    email: '',
  };
  email = '';
  requestStatus = '';
  phone = '';
  facebook = '';
  linkedin = '';
  github = '';
  twitter = '';
  instagram = '';
  companyName = '';
  companyWebsite = '';
  industry = '';
  location = '';
  aboutCompany = '';
  companyMission = '';
  employeeBenefits = '';
  socialContact: Array<{ socialtype: string; url: string }> = [];
  editMode = false;
  currentStep = 1;
  totalSteps = 3;
  profilePicUrl = 'assets/defaultLogo.png';
  profilePicExist = false;
  coverPhotoUrl: string = '';
  isCoverUploading: boolean = false;
  showInitials = false;
  userInitials = '';
  activeTab = 'about';
  tabs = [
    { id: 'about', name: 'About' },
    { id: 'careers', name: 'Careers' },
    { id: 'contact', name: 'Contact' },
    { id: 'people', name: 'People' },
    { id: 'products', name: 'Products & Services' },
  ];

  navigationTabs = [
    { id: 'about', label: 'About' },
    { id: 'jobs', label: 'Jobs' },
    // { id: 'team', label: 'Team' },
    // { id: 'contact', label: 'Contact' },
  ];

  jobFilters = [
    { label: 'All Jobs', value: 'all' },
    { label: 'Engineering', value: 'engineering' },
    { label: 'Design', value: 'design' },
    { label: 'Product', value: 'product' },
    { label: 'Marketing', value: 'marketing' },
  ];

  productsServices: string[] = [];
  teamMembers: TeamMember[] = [];
  userProfileLink = '';
  selectedJobFilter = 'all';
  currentGalleryIndex = 0;
  scrollPosition = 0;
  mapUrl: SafeResourceUrl;
  benefits: Array<{ title: string; description: string; icon: string }> = [];

  jobListings: Job[] = [];

  defaultValues = [
    {
      title: 'Innovation',
      description:
        'We constantly push boundaries and embrace new technologies to stay ahead of the curve.',
    },
    {
      title: 'Excellence',
      description:
        'We strive for excellence in everything we do, from product development to customer service.',
    },
    {
      title: 'Collaboration',
      description:
        'We believe in the power of teamwork and foster a collaborative environment.',
    },
    {
      title: 'Integrity',
      description:
        'We conduct business with honesty, transparency, and ethical practices.',
    },
  ];

  filteredJobs: Job[] = [];
  isLoading = true;
  visibleSections: string[] = ['about'];

  numberOfEmployees: string | undefined;
  yearEstablished: string | undefined;
  coreValues = '';

  // Industry options for dropdown
  industryOptions = [
    { label: 'Technology', value: 'technology' },
    { label: 'Healthcare', value: 'healthcare' },
    { label: 'Finance', value: 'finance' },
    { label: 'Education', value: 'education' },
    { label: 'Manufacturing', value: 'manufacturing' },
    { label: 'Retail', value: 'retail' },
    { label: 'Marketing', value: 'marketing' },
    { label: 'Consulting', value: 'consulting' },
    { label: 'Real Estate', value: 'real-estate' },
    { label: 'Other', value: 'other' },
  ];

  constructor(
    private userService: UserService,
    private recruiterService: RecruiterDetailService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService
  ) {
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.0973253597435!2d-122.4194!3d37.7749!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDQ2JzI5LjYiTiAxMjLCsDI1JzA5LjgiVw!5e0!3m2!1sen!2sus!4v1234567890'
    );
  }

  ngOnInit(): void {
    this.filteredJobs = this.jobListings;
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserData(): void {
    this.isLoading = true;

    // Check if userId is present in route parameters
    this.route.params.subscribe((params) => {
      const routeUserId = params['userId'];

      if (routeUserId) {
        // Load data for specific user ID
        this.loadSpecificUserData(routeUserId);
      } else {
        // Load data for current logged-in user
        this.loadCurrentUserData();
      }
    });
  }

  private loadSpecificUserData(userId: string): void {
    this.userService
      .getUserProfileById(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          if (user) {
            this.user = user;
            this.userId = user._id;
            this.isCurrentUser = false; // This is not the current user
            this.userProfileLink = `${window.location.origin}/profile-seeker/${this.userId}`;
            this.updateUserInfo(user);
            this.loadProfilePic(user._id);
            this.loadSpecificCompanyData(userId);
            if (user.coverPhotoUrl) {
              const base = location.hostname === 'localhost' ? 'https://hiyrnow-v1-721026586154.europe-west1.run.app' : '';
              this.coverPhotoUrl = user.coverPhotoUrl.startsWith('http') ? user.coverPhotoUrl : base + user.coverPhotoUrl;
            }
          }
        },
        error: (error: Error) => {
          console.error('Error fetching specific user data:', error);
          this.setDefaultProfilePic();
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  private loadCurrentUserData(): void {
    this.userService
      .findLoggedUser()
      .then((user: User) => {
        if (user) {
          this.user = user;
          this.userId = user._id;
          this.isCurrentUser = true;
          this.userProfileLink = `${window.location.origin}/profile-seeker/${this.userId}`;
          this.updateUserInfo(user);
          this.loadProfilePic(user._id);
          this.loadCompanyData();
          // ✅ ADD THESE 4 LINES
          if (user.coverPhotoUrl) {
            const base = location.hostname === 'localhost' ? 'https://hiyrnow-v1-721026586154.europe-west1.run.app' : '';
            this.coverPhotoUrl = user.coverPhotoUrl.startsWith('http') ? user.coverPhotoUrl : base + user.coverPhotoUrl;
          }
        }
      })
      .catch((error: Error) => {
        console.error('Error fetching user data:', error);
        this.setDefaultProfilePic();
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  private loadSpecificCompanyData(userId: string): void {
    // Use the new method to fetch recruiter details by specific user ID
    this.recruiterService
      .findRecruiterDetailsBySpecificUserId(userId)
      .then((companyData: RecruiterDetail) => {
        if (companyData) {
          this.recruiter = companyData;
          this.updateCompanyId = companyData._id;
          this.updateCompanyDetails(companyData);
          this.updateCompanyObject(companyData);
        }
      })
      .catch((error: Error) => {
        console.error('Error fetching company data:', error);
        // TODO: Show error message to user
      });
  }

  private loadCompanyData(): void {
    this.recruiterService
      .findRecruiterDetailsByUserId()
      .then((companyData: RecruiterDetail) => {
        if (companyData) {
          this.recruiter = companyData;
          this.updateCompanyId = companyData._id;
          this.updateCompanyDetails(companyData);
          this.updateCompanyObject(companyData);
        }
      })
      .catch((error: Error) => {
        console.error('Error fetching company data:', error);
        // TODO: Show error message to user
      });
  }

  private updateCompanyDetails(companyData: RecruiterDetail): void {
    this.title = companyData.title || '';
    this.companyName = companyData.company || '';
    this.company.name = companyData.company || '';
    this.companyWebsite = companyData.companyWebsite || '';
    this.company.website = companyData.companyWebsite || '';
    this.industry = companyData.industry || '';
    this.company.industry = companyData.industry || '';
    this.location = companyData.location || '';
    this.company.location = companyData.location || '';
    this.aboutCompany = companyData.aboutCompany || '';
    this.company.description = companyData.aboutCompany || '';
    this.numberOfEmployees = companyData.numberOfEmployees;
    this.yearEstablished = companyData.yearEstablished;
    this.companyMission = companyData.companyMission || '';
    this.company.mission = companyData.companyMission || '';
    this.coreValues = companyData.coreValues || '';
    this.employeeBenefits = companyData.employeeBenefits || '';
    this.company.employeeBenefits = companyData.employeeBenefits || '';
    this.company.address = companyData.address || '';
    this.company.phone = companyData.phone || '';
    this.company.email = companyData.email || '';
    this.productsServices = companyData.productsServices || [];
    this.teamMembers = companyData.teamMembers || [];

    // Update social media links
    if (companyData.socialMedia && companyData.socialMedia.length > 0) {
      this.company.socialMedia = companyData.socialMedia;
      // Extract individual social media URLs
      this.linkedin = companyData.socialMedia.find(s => s.icon === 'linkedin')?.url || '';
      this.twitter = companyData.socialMedia.find(s => s.icon === 'twitter')?.url || '';
      this.instagram = companyData.socialMedia.find(s => s.icon === 'instagram')?.url || '';
      this.facebook = companyData.socialMedia.find(s => s.icon === 'facebook')?.url || '';
    }
  }

  private updateCompanyObject(companyData: RecruiterDetail): void {
    if (companyData) {
      this.company = {
        name: this.username || this.company.name,
        logo: this.profilePicUrl || this.company.logo,
        banner: this.company.banner,
        tagline: companyData.tagline || this.company.tagline,
        website: this.company.website || this.company.website,
        industry: companyData.industry || this.company.industry,
        founded: this.yearEstablished
          ? this.yearEstablished.toString()
          : this.company.founded,
        size: this.numberOfEmployees
          ? `${this.numberOfEmployees}`
          : this.company.size,
        location: this.company.location || this.company.location,
        description: this.company.description || this.company.description,
        mission: this.company.mission || this.company.mission,
        employeeBenefits:
          this.company.employeeBenefits || this.company.employeeBenefits,
        socialMedia: companyData.socialMedia || this.company.socialMedia,
        address: companyData.address || this.company.address,
        phone: this.phone || this.company.phone,
        email: this.email || this.company.email,
      };

      // if (this.company.employeeBenefits) {
      //   try {
      //     const parsedBenefits =
      //       typeof this.company.employeeBenefits === 'string'
      //         ? JSON.parse(this.company.employeeBenefits)
      //         : this.company.employeeBenefits;

      //     if (Array.isArray(parsedBenefits)) {
      //       this.benefits = parsedBenefits;
      //     }
      //   } catch (e) {
      //     console.error('Error parsing employee benefits:', e);
      //   }
      // }

      // Generate initials if no profile picture exists
      if (!this.profilePicExist) {
        this.generateInitials();
      }
    }
  }

  private updateUserInfo(user: User): void {
    if (!user) return;

    this.updateId = user._id;
    this.username = user.username;
    this.password = user.password;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.phone = user.phone;
    this.requestStatus = user.requestStatus;

    if (user.socialContact?.length) {
      this.socialContact = user.socialContact;
      this.facebook =
        this.socialContact.find((s) => s.socialtype === 'facebook')?.url || '';
      this.github =
        this.socialContact.find((s) => s.socialtype === 'github')?.url || '';
      this.linkedin =
        this.socialContact.find((s) => s.socialtype === 'linkedin')?.url || '';
      this.twitter =
        this.socialContact.find((s) => s.socialtype === 'twitter')?.url || '';
    }

    // Generate initials if no profile picture exists
    if (!this.profilePicExist) {
      this.generateInitials();
    }
  }

  loadProfilePic(userId: string): void {
    if (!userId) {
      this.setDefaultProfilePic();
      return;
    }

    this.userService
      .getProfilePic(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Blob) => {
          if (data && data.size > 0) {
            const reader = new FileReader();
            reader.onload = () => {
              // Add cache-busting parameter to ensure fresh image
              const base64Url = reader.result as string;
              // For data URLs, we don't need cache-busting as they're already unique
              this.profilePicUrl = base64Url;
              this.profilePicExist = true;
              this.showInitials = false;
              this.company.logo = this.profilePicUrl;
            };
            reader.readAsDataURL(data);
          } else {
            this.setDefaultProfilePic();
          }
        },
        error: (error) => {
          console.error('Error fetching profile picture:', error);
          this.setDefaultProfilePic();
        },
      });
  }

  setDefaultProfilePic(): void {
    this.profilePicUrl = 'assets/defaultLogo.png';
    this.profilePicExist = false;
    this.company.logo = this.profilePicUrl;
    this.showInitials = true;
    this.generateInitials();
  }

  private generateInitials(): void {
    // Try to get initials from company name first, then user name
    let name = this.company.name || '';

    if (!name && this.user) {
      // If no company name, use user's first and last name
      const firstName = this.user.firstName || '';
      const lastName = this.user.lastName || '';
      name = `${firstName} ${lastName}`.trim();
    }

    if (!name) {
      // If still no name, use username
      name = this.username || '';
    }

    if (name) {
      const words = name.trim().split(/\s+/);
      if (words.length >= 2) {
        // Take first letter of first and last word
        this.userInitials = (
          words[0].charAt(0) + words[words.length - 1].charAt(0)
        ).toUpperCase();
      } else if (words.length === 1) {
        // Take first two letters if only one word
        this.userInitials = words[0].substring(0, 2).toUpperCase();
      } else {
        this.userInitials = 'NA';
      }
    } else {
      this.userInitials = 'NA';
    }
  }

  openProfilePicModal(): void {
    if (this.isCurrentUser) {
      this.isProfilePicModalOpen = true;
    }
  }

  closeProfilePicModal(): void {
    this.isProfilePicModalOpen = false;
    this.clearSelectedFile();
  }

  onProfilePicSelected(event: Event): void {
    if (!this.isCurrentUser) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastr.error('Please select a valid image file.')
        // Reset input
        input.value = '';
        return;
      }

      // Validate file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        this.toastr.error('File size must be less than 2MB.');
        // Reset input
        input.value = '';
        return;
      }

      // Clear previous preview if exists
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
      }

      this.selectedFile = file;
      this.previewUrl = URL.createObjectURL(file);
    }
  }

  droppedProfilePic(files: NgxFileDropEntry[]): void {
    if (!this.isCurrentUser) return;

    // Only handle the first file
    if (files.length === 0) return;

    const droppedFile = files[0];
    if (droppedFile.fileEntry.isFile) {
      const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
      fileEntry.file((file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          this.toastr.error('Please select a valid image file.')
          return;
        }

        // Validate file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
          this.toastr.error('File size must be less than 2MB.');
          return;
        }

        // Clear previous preview if exists
        if (this.previewUrl) {
          URL.revokeObjectURL(this.previewUrl);
        }

        this.selectedFile = file;
        this.previewUrl = URL.createObjectURL(file);
      });
    }
  }

  private uploadProfilePic(file: File): void {
    console.log('uploadProfilePic called with file:', file);
    console.log('userId:', this.userId);

    if (!this.userId) {
      this.toastr.error('User ID is missing. Please try again.');
      return;
    }

    this.isUploading = true;
    const formData = new FormData();
    formData.append('profilePic', file, file.name);
    formData.append('userId', this.userId);

    console.log('FormData created with file:', file.name);
    console.log('FormData userId:', this.userId);

    this.userService
      .uploadProfilePic(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { file_uploaded: boolean; profilePicUrl: string }) => {
          console.log('Upload response received:', response);

          if (response.file_uploaded) {
            console.log(
              'File uploaded successfully, updating profile picture URL'
            );

            // Clear the current image to force reload
            this.profilePicUrl = '';
            this.company.logo = '';

            // Reload the profile picture from server immediately to ensure fresh image
            if (this.userId) {
              // Use setTimeout to ensure the clear happens first, then reload
              setTimeout(() => {
                this.loadProfilePic(this.userId);
              }, 100);
            }

            this.profilePicExist = true;
            this.showInitials = false;

            this.closeProfilePicModal();
            alert('Profile picture uploaded successfully');
          } else {
            console.log('File upload failed in response');
            this.toastr.error('Upload failed. Please try again.');
            this.isUploading = false;
          }
        },
        error: (error) => {
          console.error('Error uploading profile picture:', error);
          let errorMessage =
            'Failed to upload profile picture. Please try again.';

          if (error.status === 401) {
            errorMessage = 'You are not authenticated. Please log in again.';
          } else if (error.status === 400) {
            errorMessage = 'Invalid file format or size. Please try again.';
          } else if (error.error && error.error.err_desc) {
            errorMessage = `Upload failed: ${error.error.err_desc}`;
          }

          this.toastr.error(errorMessage);
          // Don't close modal on error - allow user to try again
          this.isUploading = false;
        },
        complete: () => {
          this.isUploading = false;
        },
      });
  }

  edit(): void {
    if (!this.isCurrentUser) return;

    this.editMode = true;

    // Load user data
    this.username = this.user?.username || '';
    this.firstName = this.user?.firstName || '';
    this.lastName = this.user?.lastName || '';
    this.email = this.user?.email || '';
    this.phone = this.user?.phone || '';

    // Load recruiter/company data - use already loaded properties
    this.title = this.title || this.recruiter?.title || '';
    this.companyName = this.companyName || this.company.name || this.recruiter?.company || '';
    this.company.name = this.companyName;
    this.companyWebsite = this.companyWebsite || this.company.website || this.recruiter?.companyWebsite || '';
    this.company.website = this.companyWebsite;
    this.industry = this.industry || this.company.industry || this.recruiter?.industry || '';
    this.company.industry = this.industry;
    this.location = this.location || this.company.location || this.recruiter?.location || '';
    this.company.location = this.location;
    this.aboutCompany = this.aboutCompany || this.company.description || this.recruiter?.aboutCompany || '';
    this.company.description = this.aboutCompany;
    this.companyMission = this.companyMission || this.company.mission || this.recruiter?.companyMission || '';
    this.company.mission = this.companyMission;
    this.coreValues = this.coreValues || this.recruiter?.coreValues || '';
    this.employeeBenefits = this.employeeBenefits || this.company.employeeBenefits || this.recruiter?.employeeBenefits || '';
    this.company.employeeBenefits = this.employeeBenefits;
    this.numberOfEmployees = this.numberOfEmployees || this.recruiter?.numberOfEmployees || '';
    this.yearEstablished = this.yearEstablished || this.recruiter?.yearEstablished || '';
    this.company.address = this.company.address || this.recruiter?.address || '';
    this.company.phone = this.company.phone || this.recruiter?.phone || '';
    this.company.email = this.company.email || this.recruiter?.email || '';
    this.company.founded = this.yearEstablished || this.company.founded || '';
    this.company.size = this.numberOfEmployees || this.company.size || '';

    // Initialize social media if not already set
    if (!this.company.socialMedia || this.company.socialMedia.length === 0) {
      this.company.socialMedia = [
        { icon: 'linkedin', url: this.linkedin || '' },
        { icon: 'twitter', url: this.twitter || '' },
        { icon: 'instagram', url: this.instagram || '' },
      ];
    } else {
      // Update individual social media variables from company.socialMedia
      this.linkedin = this.company.socialMedia.find(s => s.icon === 'linkedin')?.url || this.linkedin || '';
      this.twitter = this.company.socialMedia.find(s => s.icon === 'twitter')?.url || this.twitter || '';
      this.instagram = this.company.socialMedia.find(s => s.icon === 'instagram')?.url || this.instagram || '';
      this.facebook = this.company.socialMedia.find(s => s.icon === 'facebook')?.url || this.facebook || '';
    }

    // Also check socialContact for user-level social links
    if (this.socialContact && this.socialContact.length > 0) {
      if (!this.linkedin) {
        this.linkedin = this.socialContact.find((s) => s.socialtype === 'linkedin')?.url || '';
      }
      if (!this.github) {
        this.github = this.socialContact.find((s) => s.socialtype === 'github')?.url || '';
      }
      if (!this.facebook) {
        this.facebook = this.socialContact.find((s) => s.socialtype === 'facebook')?.url || '';
      }
      if (!this.twitter) {
        this.twitter = this.socialContact.find((s) => s.socialtype === 'twitter')?.url || '';
      }
    }
  }

  cancel(): void {
    if (!this.isCurrentUser) return;

    this.editMode = false;
    this.loadUserData();
  }

  update(): void {
    if (!this.isCurrentUser) return;

    if (!this.validateForm()) {
      return;
    }

    const social = [
      { socialtype: 'github', url: this.github },
      { socialtype: 'linkedin', url: this.linkedin },
      { socialtype: 'facebook', url: this.facebook },
      { socialtype: 'twitter', url: this.twitter },
    ].filter((social) => social.url.trim() !== '');

    const updatedUser = {
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      socialContact: social,
    };

    // Build social media array from individual fields
    const socialMediaArray = [];
    if (this.linkedin && this.linkedin.trim()) {
      socialMediaArray.push({ icon: 'linkedin', url: this.linkedin.trim() });
    }
    if (this.twitter && this.twitter.trim()) {
      socialMediaArray.push({ icon: 'twitter', url: this.twitter.trim() });
    }
    if (this.instagram && this.instagram.trim()) {
      socialMediaArray.push({ icon: 'instagram', url: this.instagram.trim() });
    }
    if (this.facebook && this.facebook.trim()) {
      socialMediaArray.push({ icon: 'facebook', url: this.facebook.trim() });
    }

    const company = {
      title: this.title,
      company: this.companyName || this.company.name,
      companyWebsite: this.companyWebsite || this.company.website,
      industry: this.industry || this.company.industry,
      location: this.location || this.company.location,
      aboutCompany: this.aboutCompany || this.company.description,
      companyMission: this.companyMission || this.company.mission,
      coreValues: this.coreValues,
      numberOfEmployees: this.numberOfEmployees || this.company.size || '',
      yearEstablished: this.yearEstablished || this.company.founded || '',
      productsServices: this.productsServices,
      teamMembers: this.teamMembers,
      address: this.company.address,
      phone: this.company.phone,
      email: this.company.email,
      employeeBenefits: this.employeeBenefits || this.company.employeeBenefits,
      socialMedia: socialMediaArray.length > 0 ? socialMediaArray : (this.company.socialMedia || []),
    };

    this.editMode = false;

    this.userService
      .updateUserProfile(updatedUser)
      .then(() => {
        this.recruiterService
          .updateRecruiterDetail(this.updateCompanyId, company)
          .then(() => {
            this.toastr.success('Profile updated successfully');
            this.loadUserData();
          })
          .catch((error: Error) => {
            console.error('Error updating company data:', error);
            this.editMode = true;
            this.toastr.error('Failed to update company information.');
          });
      })
      .catch((error: Error) => {
        console.error('Error updating user data:', error);
        this.editMode = true;
        this.toastr.error('Failed to update user information.');
      });
  }

  updateRecruiter(): void {
    // Alias for update() method to match template
    this.update();
  }

  private validateForm(): boolean {
    if (!this.username?.trim()) {
      this.toastr.warning('Username is required');
      return false;
    }
    if (!this.email?.trim()) {
      this.toastr.warning('Email is required');
      return false;
    }
    const companyName = this.companyName || this.company.name;
    if (!companyName?.trim()) {
      this.toastr.warning('Company name is required');
      return false;
    }
    const industry = this.industry || this.company.industry;
    if (!industry?.trim()) {
      this.toastr.warning('Industry is required');
      return false;
    }
    const location = this.location || this.company.location;
    if (!location?.trim()) {
      this.toastr.warning('Location is required');
      return false;
    }
    return true;
  }

  addProductService(): void {
    if (!this.isCurrentUser) return;
    this.productsServices.push('');
  }

  removeProductService(index: number): void {
    if (!this.isCurrentUser) return;
    this.productsServices.splice(index, 1);
  }

  addTeamMember(): void {
    if (!this.isCurrentUser) return;
    this.teamMembers.push({
      name: '',
      position: '',
      avatar: '',
      bio: '',
      socialLinks: [],
    });
  }

  removeTeamMember(index: number): void {
    if (!this.isCurrentUser) return;
    this.teamMembers.splice(index, 1);
  }

  setActiveTab(tabId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.activeTab = tabId;
  }

  checkHidden(url: string): boolean {
    return url === '';
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    this.scrollPosition = window.pageYOffset;
  }

  toggleSection(section: string): void {
    const index = this.visibleSections.indexOf(section);
    if (index === -1) {
      this.visibleSections.push(section);
    } else {
      this.visibleSections.splice(index, 1);
    }
  }

  isSectionVisible(section: string): boolean {
    return this.visibleSections.includes(section);
  }

  // Step navigation methods
  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
    }
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return !!(
          this.company.name?.trim() &&
          this.company.industry?.trim() &&
          this.company.location?.trim()
        );
      case 2:
        return !!(
          this.company.description?.trim() && this.company.mission?.trim()
        );
      case 3:
        return true; // Contact info is optional
      default:
        return false;
    }
  }

  getStepProgress(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  // Add Math property for template access
  Math = Math;

  // Social media management methods
  addSocialMedia(): void {
    if (!this.isCurrentUser) return;
    this.company.socialMedia.push({ icon: 'linkedin', url: '' });
  }

  removeSocialMedia(index: number): void {
    if (!this.isCurrentUser) return;
    this.company.socialMedia.splice(index, 1);
  }

  // File upload related properties and methods
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isDragOver = false;
  isUploading = false;
  isDarkMode = false; // Add this property for template compatibility

  fileOverProfilePic(event: any): void {
    this.isDragOver = true;
  }

  fileLeaveProfilePic(event: any): void {
    this.isDragOver = false;
  }

  clearSelectedFile(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.selectedFile = null;
    this.previewUrl = null;
    // Reset file input
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  uploadProfilePicFromModal(): void {
    console.log('uploadProfilePicFromModal called');
    console.log('selectedFile:', this.selectedFile);
    console.log('isCurrentUser:', this.isCurrentUser);
    console.log('userId:', this.userId);

    if (!this.selectedFile) {
      alert('Please select a file first.');
      return;
    }

    if (!this.isCurrentUser) {
      alert('You can only update your own profile picture.');
      return;
    }

    if (!this.userId) {
      this.toastr.error('User ID is missing. Please try again.');
      return;
    }

    this.uploadProfilePic(this.selectedFile);
  }

  // Test method to help debug profile picture upload
  testProfilePicUpload(): void {
    console.log('=== Profile Picture Upload Debug Info ===');
    console.log('isCurrentUser:', this.isCurrentUser);
    console.log('userId:', this.userId);
    console.log('user:', this.user);
    console.log('profilePicUrl:', this.profilePicUrl);
    console.log('profilePicExist:', this.profilePicExist);
    console.log('selectedFile:', this.selectedFile);
    console.log('isProfilePicModalOpen:', this.isProfilePicModalOpen);
    console.log('==========================================');
  }

  getCompanyInitial(companyName: string): string {
    if (!companyName) return '?';
    return companyName.charAt(0).toUpperCase();
  }

  onCoverPhotoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.toastr.error('Cover image size should be less than 10MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.coverPhotoUrl = e.target.result;
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('coverPhoto', file, file.name);
    formData.append('userId', this.userId);

    this.userService.uploadCoverPhoto(formData).subscribe({
      next: (response: any) => {
        if (response.file_uploaded || response.success) {
          const base = location.hostname === 'localhost' ? 'https://hiyrnow-v1-721026586154.europe-west1.run.app' : '';
          const rawUrl = response.coverPhotoUrl || response.url || '';
          this.coverPhotoUrl = rawUrl.startsWith('http') ? rawUrl : base + rawUrl;
          this.toastr.success('Cover photo updated successfully');
        }
      },
      error: () => {
        this.toastr.error('Failed to upload cover photo. Please try again.');
      }
    });
  }

  onImageError(event: any) {
    // Hide the image and show the fallback
    event.target.style.display = 'none';
    const parent = event.target.parentElement;
    if (parent) {
      parent.innerHTML = `
        <div class="w-28 h-28 rounded-lg border border-gray-200 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <span class="text-white font-bold text-5xl">
            ${this.getCompanyInitial(event.target.alt.replace(' logo', ''))}
          </span>
        </div>
      `;
    }
  }
}
