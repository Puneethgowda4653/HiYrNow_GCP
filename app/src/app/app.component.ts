import { Component, OnInit, Renderer2 } from '@angular/core';
import { trigger, transition, style, query, group, animate } from '@angular/animations';
import { UserService } from './services/user.service';
import { User } from './models/user.model.client';
import { Router, NavigationEnd, ActivatedRoute, Event } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { Meta, Title } from '@angular/platform-browser';
import { SeoService } from './services/seo.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        query(':enter, :leave', [
          style({ position: 'fixed', width: '100%', top: 0, left: 0 })
        ], { optional: true }),
        group([
          query(':leave', [
            style({ opacity: 1, transform: 'translateY(0px)' }),
            animate('200ms ease', style({ opacity: 0, transform: 'translateY(8px)' }))
          ], { optional: true }),
          query(':enter', [
            style({ opacity: 0, transform: 'translateY(-8px)' }),
            animate('240ms 80ms ease', style({ opacity: 1, transform: 'translateY(0px)' }))
          ], { optional: true })
        ])
      ])
    ])
  ]
})
export class AppComponent implements OnInit {
  title = 'HiyrNow';
  isNavVisible = false;
  user: User | null = new User();
  isMenuOpen = false;
  profilePicUrl: string = '';
  profilePicExist: boolean = false;
  imageUrl =
    'https://static.vecteezy.com/system/resources/thumbnails/009/734/564/small/default-avatar-profile-icon-of-social-media-user-vector.jpg';
  isDrawerOpen: boolean = false;
  showSide: boolean = false;
  isDropdownOpen = false;
  isUserMenuOpen = false;
  isDisabled = true;
  isProfileDropdownOpen: boolean = false;
  isDropdownVisible: boolean = false;
  private mouseLeaveTimer: any;
  searchTerm: string = '';
  isFocused: boolean = false;
  closeTimer: any;
  isHeaderVisible: boolean = true;
  private lastScrollTop: number = 0;
  private scrollThreshold: number = 50;
  private headerHeight: number = 80; // Approximate height of header

  isHomeRoute: boolean = false;
  isLoginPage: boolean = false;
  isRegisterPage: boolean = false;

  userID: string | null = null;
  safeAreaBottom: string = '0px';
  isMobileProfileDrawerOpen: boolean = false;
  
  // Swipe gesture tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchEndX: number = 0;
  private touchEndY: number = 0;
  private minSwipeDistance: number = 50;
  private edgeSwipeThreshold: number = 30; // Distance from edge to trigger swipe
  
  constructor(
    private seoService: SeoService,
    private userService: UserService,
    private router: Router,
    private renderer: Renderer2,
    private meta: Meta,
    private titleService: Title,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService
  ) {
    this.router.events.subscribe((event) => {
      this.isHomeRoute = this.router.url === '/home';
      this.isLoginPage = this.router.url === '/login';
      // Hide navbar on all registration-related routes
      this.isRegisterPage =
        this.router.url === '/register' ||
        this.router.url === '/onboarding' ||
        this.router.url.startsWith('/register/') ||
        this.router.url === '/role-selector' ||
        this.router.url === '/events/signup' ||
        this.router.url === '/auth-options';
    });
  }

  ngOnInit() {
  // Check if redirected from Google OAuth
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const googleUserId = sessionStorage.getItem('googleAuthUserId');
    const googleRole = sessionStorage.getItem('googleAuthRole');
    if (googleUserId) {
      sessionStorage.removeItem('googleAuthUserId');
      sessionStorage.removeItem('googleAuthRole');
      // Session is already set on backend, just fetch the user
      setTimeout(() => {
        this.userService.findLoggedUser().then((response) => {
          if (response && response._id) {
            this.user = response;
            this.userID = response._id;
            this.loadProfilePic(response._id);
            this.showSide = true;
            this.authService.checkSession().subscribe();
            // Navigate to correct dashboard based on role
            if (googleRole === 'Recruiter') {
              this.router.navigate(['/company/dashboard']);
            } else if (googleRole === 'Admin') {
              this.router.navigate(['/admin']);
            } else {
              this.router.navigate(['/dashboard-seeker']);
            }
          }
        });
      }, 300);
    }
  }

  this.sessionCheck();
  this.authService.checkSession().subscribe();
  this.router.events
    .pipe(
      filter(
        (event: Event): event is NavigationEnd =>
          event instanceof NavigationEnd
      )
    )
    .subscribe((event: NavigationEnd) => {});

  this.updateMetaTags();
}
  onSidebarMouseEnter() {
    // Disabled — sidebar opens/closes via arrow button only
  }

  onSidebarMouseLeave() {
    // Disabled — sidebar opens/closes via arrow button only
  }

  onSearch(): void {
    if (this.searchTerm.trim()) {
      // Implement search logic here
      console.log('Searching for:', this.searchTerm);
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    this.isFocused = false;
  }

  // Optional: Method to cancel the timer if mouse re-enters before closing
  cancelMouseLeaveTimer() {
    if (this.mouseLeaveTimer) {
      clearTimeout(this.mouseLeaveTimer);
    }
  }
  startCloseTimer() {
    // Delay closing to allow interaction with dropdown
    this.closeTimer = setTimeout(() => {
      this.isProfileDropdownOpen = false;
    }, 300); // 300ms delay
  }

  cancelCloseTimer() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }
  }

  handleCreditsClick() {
    this.cancelCloseTimer();
    this.router.navigate(['/credits']);
    this.isProfileDropdownOpen = false;
  }

  handleSettingsClick() {
    this.cancelCloseTimer();
    this.router.navigate(['/settings']);
    this.isProfileDropdownOpen = false;
  }

  openProfileDropdown() {
    this.isProfileDropdownOpen = true;
  }

  closeprofiledorp() {
    this.isProfileDropdownOpen = false;
  }

  navigateToSettings() {
    if (this.user?.role === 'JobSeeker') {
      this.router.navigate(['/profile', this.userID]);
    } else if (this.user?.role === 'Recruiter') {
      this.router.navigate(['/company/profile']);
    }
    this.isProfileDropdownOpen = false;
  }

  updateMetaTags() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        mergeMap((route) => route.data)
      )
      .subscribe((event) => {
        this.titleService.setTitle(event['title']);
        this.meta.updateTag({
          name: 'description',
          content: event['description'],
        });
        this.meta.updateTag({ name: 'keywords', content: event['keywords'] });
      });
  }
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleDrawer() {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  private loadScript(src: string): void {
    const script = this.renderer.createElement('script');
    script.type = 'text/javascript';
    script.src = src;
    script.defer = true;
    this.renderer.appendChild(document.head, script);
  }

  // loadProfilePic(userId: string): void {
  //   this.userService.getProfilePic(userId).subscribe(
  //     (data: Blob) => {
  //       const reader = new FileReader();
  //       reader.onload = () => {
  //         this.profilePicUrl = reader.result as string;
  //         this.profilePicExist = !!this.profilePicUrl;
  //       };
  //       reader.readAsDataURL(data);
  //     },
  //     error => {
  //       console.error('Error fetching profile picture:', error);
  //     }
  //   );
  // }
  loadProfilePic(userId: string): void {
    this.userService.getProfilePic(userId).subscribe(
      (data: Blob) => {
        // Try to read the blob as text to check for JSON error
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const text = reader.result as string;
            const json = JSON.parse(text);
            if (json && json.message === 'No profile picture for user') {
              this.profilePicExist = false;
              this.profilePicUrl = '';
              return;
            }
          } catch (e) {
            // Not JSON, so treat as image
            const imageReader = new FileReader();
            imageReader.onload = () => {
              this.profilePicUrl = imageReader.result as string;
              this.profilePicExist = true;
            };
            imageReader.readAsDataURL(data);
            return;
          }
        };
        reader.readAsText(data);
      },
      (error) => {
        console.error('Error fetching profile picture:', error);
        this.profilePicExist = false;
        this.profilePicUrl = '';
      }
    );
  }

  setDefaultProfilePic(): void {
    if (!this.user) {
      this.profilePicUrl = 'assets/default.png';
      this.profilePicExist = false;
      return;
    }
    
    if (this.user.role === 'JobSeeker') {
      this.profilePicUrl = 'assets/defaultUser.png'; // Default for job seekers
    } else if (this.user.role === 'Recruiter') {
      this.profilePicUrl = 'assets/defaultLogo.png'; // Default for recruiters
    } else {
      this.profilePicUrl = 'assets/default.png'; // Fallback default
    }
    this.profilePicExist = false;
  }

  sessionCheck(): void {
    this.userService.findLoggedUser().then((response) => {
      // Check if response is a valid user object (not an error)
      if (response && !response.error && response._id) {
        this.user = response;
        this.userID = response._id;
        console.log("user", this.user);
        this.loadProfilePic(response._id);
        this.showSide = true;
      } else {
        // Handle error case - user not logged in or session expired
        console.log("No valid user session:", response);
        this.user = null;
        this.userID = null;
        this.showSide = false;
        this.profilePicExist = false;
      }
    }).catch((error) => {
      // Handle fetch errors
      console.error("Error checking session:", error);
      this.user = null;
      this.userID = null;
      this.showSide = false;
      this.profilePicExist = false;
    });
  }

  logout(): void {
    this.userService
      .logout()
      .then(() => this.router.navigate(['/**']))
      .then(() => this.sessionCheck());
    this.showSide = false;
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
    this.isDropdownOpen = false;
  }

  toggleMobileProfileDrawer(): void {
    this.isMobileProfileDrawerOpen = !this.isMobileProfileDrawerOpen;
  }

  closeMobileProfileDrawer(): void {
    this.isMobileProfileDrawerOpen = false;
  }
  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  onWindowScroll(event: Event): void {
    const currentScrollTop = window.pageYOffset;

    // Show header when scrolling up or at the top
    if (
      currentScrollTop < this.lastScrollTop ||
      currentScrollTop < this.scrollThreshold
    ) {
      this.isHeaderVisible = true;
    }
    // Hide header when scrolling down
    else if (
      currentScrollTop > this.lastScrollTop &&
      currentScrollTop > this.scrollThreshold
    ) {
      this.isHeaderVisible = false;
    }

    this.lastScrollTop = currentScrollTop;
  }

  onMouseOver(event: MouseEvent): void {
    // Show header when mouse is near the top of the page
    if (event.clientY < this.headerHeight) {
      this.isHeaderVisible = true;
    }
  }

  // Swipe gesture handlers for main content (to open drawer)
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  onTouchMove(event: TouchEvent): void {
    // Optional: Add visual feedback during swipe
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
    this.handleSwipeGesture();
  }

  // Swipe gesture handlers for drawer (to close drawer)
  onDrawerTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  onDrawerTouchMove(event: TouchEvent): void {
    // Optional: Add drag effect
  }

  onDrawerTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
    this.handleDrawerSwipe();
  }

  private handleSwipeGesture(): void {
    const swipeDistanceX = this.touchEndX - this.touchStartX;
    const swipeDistanceY = Math.abs(this.touchEndY - this.touchStartY);
    const screenWidth = window.innerWidth;

    // Only trigger if:
    // 1. Swipe started from right edge
    // 2. Swipe is primarily horizontal (not vertical scroll)
    // 3. Swipe distance is significant
    // 4. Swipe is from right to left (opening drawer from right)
    const isFromRightEdge = this.touchStartX >= screenWidth - this.edgeSwipeThreshold;
    const isHorizontalSwipe = swipeDistanceY < 50; // Less vertical movement
    const isSignificantSwipe = Math.abs(swipeDistanceX) > this.minSwipeDistance;
    const isLeftSwipe = swipeDistanceX < 0; // Swipe from right to left

    if (isFromRightEdge && isHorizontalSwipe && isSignificantSwipe && isLeftSwipe && !this.isMobileProfileDrawerOpen) {
      this.isMobileProfileDrawerOpen = true;
    }
  }

  private handleDrawerSwipe(): void {
    const swipeDistanceX = this.touchEndX - this.touchStartX;
    const swipeDistanceY = Math.abs(this.touchEndY - this.touchStartY);

    // Close drawer on right swipe (swipe away)
    const isHorizontalSwipe = swipeDistanceY < 50;
    const isSignificantSwipe = Math.abs(swipeDistanceX) > this.minSwipeDistance;
    const isRightSwipe = swipeDistanceX > 0; // Swipe from left to right

    if (isHorizontalSwipe && isSignificantSwipe && isRightSwipe && this.isMobileProfileDrawerOpen) {
      this.isMobileProfileDrawerOpen = false;
    }
  }
}
