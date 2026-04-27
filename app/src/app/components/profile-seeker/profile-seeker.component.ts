import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { UserService } from '../../services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ResumeUploadService } from 'src/app/services/resume-upload.service';

interface Tab {
  id: string;
  label: string;
  icon: string;
  isCompleted: boolean;
}

interface ProfileCompletion {
  score: number;
  sectionsCompleted: number;
  totalSections: number;
  remainingSections: string[];
}

@Component({
  selector: 'app-profile-seeker',
  templateUrl: './profile-seeker.component.html',
  styleUrls: ['./profile-seeker.component.css'],
})
export class ProfileSeekerComponent implements OnInit, AfterViewInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  activeTab = 'personal';
  canScrollLeft = false;
  canScrollRight = false;
  userProfileLink: string | undefined;
  userId: string = '';
  isJobSeeking = false;
  
  // Touch handling properties
  private touchStartX = 0;
  private touchEndX = 0;
  private readonly SWIPE_THRESHOLD = 50; // Minimum distance for a swipe

  profileCompletion: ProfileCompletion = {
    score: 0,
    sectionsCompleted: 0,
    totalSections: 6,
    remainingSections: [],
  };

  tabs: Tab[] = [
    {
      id: 'personal',
      label: 'Personal Info',
      icon: 'fas fa-user',
      isCompleted: false,
    },
    {
      id: 'resume',
      label: 'Resume',
      icon: 'fas fa-file-alt',
      isCompleted: false,
    },
    {
      id: 'experience',
      label: 'Experience',
      icon: 'fas fa-briefcase',
      isCompleted: false,
    },
    {
      id: 'education',
      label: 'Education',
      icon: 'fas fa-graduation-cap',
      isCompleted: false,
    },
    { id: 'skills', label: 'Skills', icon: 'fas fa-code', isCompleted: false },
    {
      id: 'projects',
      label: 'Projects',
      icon: 'fas fa-folder',
      isCompleted: false,
    },
  ];
  isProfilePicModalOpen = false;
  profilePicUrl: string = 'assets/defaultLogo.png';
  profilePicExist = false;
  constructor(
    private userService: UserService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initializeUserData();
  }
  // Profile picture handling
 
  ngAfterViewInit() {
    this.checkScroll();
    setTimeout(() => this.checkScroll(), 500); // Check again after content loads
  }

  private async initializeUserData() {
    try {
      const user = await this.userService.findLoggedUser();
      if (user) {
        this.userId = user._id;
        this.userProfileLink = `${window.location.origin}/profile-seeker/${this.userId}`;
        this.loadProfileCompletion();
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  }

  private loadProfileCompletion() {
    this.userService.getProfileCompletionScore(this.userId).subscribe({
      next: (data) => {
        // Ensure 'data' has all required properties for ProfileCompletion
        this.profileCompletion = {
          score: data.score,
          sectionsCompleted: data.sectionsCompleted || 0, // Default to 0 if undefined
          totalSections: data.totalSections || 6, // Default to 6 if undefined
          remainingSections: data.remainingSections || [], // Default to empty array if undefined
        };
        this.updateTabCompletionStatus();
      },
      error: (error) =>
        console.error('Error fetching profile completion:', error),
    });
  }

  private updateTabCompletionStatus() {
    // Update tab completion status based on profileCompletion data
    this.tabs = this.tabs.map((tab) => ({
      ...tab,
      isCompleted: !this.profileCompletion.remainingSections.includes(
        tab.id === 'personal' ? 'Personal Info' : 
        tab.id === 'resume' ? 'Resume' :
        tab.id === 'experience' ? 'Experience' :
        tab.id === 'education' ? 'Education' :
        tab.id === 'skills' ? 'Skills' : 'Projects'
      ),
    }));
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScroll();
  }

  // Touch event listeners for swipe detection
  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].clientX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent) {
    this.touchEndX = e.changedTouches[0].clientX;
    this.handleSwipe();
  }

  private handleSwipe() {
    const distance = this.touchEndX - this.touchStartX;
    
    // Check if the swipe distance exceeds our threshold
    if (Math.abs(distance) > this.SWIPE_THRESHOLD) {
      if (distance > 0 && this.canScrollLeft) {
        // Swipe right
        this.scrollLeft();
      } else if (distance < 0 && this.canScrollRight) {
        // Swipe left
        this.scrollRight();
      }
    }
  }

  checkScroll() {
    const element = this.scrollContainer?.nativeElement;
    if (element) {
      this.canScrollLeft = element.scrollLeft > 0;
      this.canScrollRight =
        element.scrollLeft < element.scrollWidth - element.clientWidth - 5; // 5px buffer
    }
  }

  scrollLeft() {
    const element = this.scrollContainer.nativeElement;
    element.scrollBy({
      left: -element.clientWidth / 2,
      behavior: 'smooth',
    });
    
    // Find tab index and set active tab if changing sections
    this.updateActiveTabOnScroll();
  }

  scrollRight() {
    const element = this.scrollContainer.nativeElement;
    element.scrollBy({
      left: element.clientWidth / 2,
      behavior: 'smooth',
    });
    
    // Find tab index and set active tab if changing sections
    this.updateActiveTabOnScroll();
  }

  private updateActiveTabOnScroll() {
    setTimeout(() => {
      const element = this.scrollContainer.nativeElement;
      const scrollPosition = element.scrollLeft + (element.clientWidth / 2);
      const tabElements = element.querySelectorAll('button[role="tab"]');
      
      let closestTab = null;
      let closestDistance = Number.MAX_VALUE;
      
      tabElements.forEach((tabElement: Element) => {
        const rect = tabElement.getBoundingClientRect();
        const tabCenter = rect.left + (rect.width / 2);
        const distance = Math.abs(tabCenter - (element.getBoundingClientRect().left + scrollPosition));
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestTab = tabElement;
        }
      });
      
      if (closestTab) {
        const tabId = (closestTab as Element).getAttribute('aria-controls')?.replace('panel-', '');
        if (tabId && this.tabs.find(tab => tab.id === tabId)) {
          this.setActiveTab(tabId);
        }
      }
    }, 300); // Wait for scroll animation to complete
  }

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
    
    // Scroll to the active tab if it's off-screen (for mobile)
    setTimeout(() => {
      const element = this.scrollContainer?.nativeElement;
      if (element) {
        const activeTabElement = element.querySelector(`button[aria-controls="panel-${tabId}"]`);
        if (activeTabElement) {
          const containerRect = element.getBoundingClientRect();
          const tabRect = activeTabElement.getBoundingClientRect();
          
          // Check if tab is partially or fully outside the visible container
          if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
            activeTabElement.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center'
            });
          }
        }
      }
    }, 10);
  }


}