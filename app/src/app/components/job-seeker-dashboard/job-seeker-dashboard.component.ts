import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { JobPostingService } from '../../services/job-posting.service';
import { Chart, ChartConfiguration, ChartData, ChartTypeRegistry } from 'chart.js/auto';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { SaveJobService } from '../../services/save-job.service';
import { forkJoin } from 'rxjs';
// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface DashboardResponse {
  analyticsData: {
    applicationStats: {
      total: number;
      successful: number;
      rejected: number;
      pending: number;
      successRate: number;
    };
    interviewMetrics: {
      total: number;
      completed: number;
      upcoming: number;
      averageScore: number;
    };
    jobCategories: {
      frontend: number;
      backend: number;
      fullstack: number;
      devops: number;
      other: number;
    };
    monthlyApplications: {
      labels: string[];
      data: number[];
    };
  };
  integrations: {
    linkedin: boolean;
    calendar: boolean;
    videoConference: boolean;
    documents: boolean;
  };
  _id: string;
  user: string;
  __v: number;
  lastUpdated: string;
}

interface CareerSnapshot {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

interface ApplicationStage {
  name: string;
  count: number;
  color: string;
  icon: string;
}

interface JobRecommendation {
  id: string;
  companyLogo: string;
  companyName: string;
  jobTitle: string;
  title?: string;      // DB field alias
  company?: string;    // DB field alias
  matchScore: number;
  missingSkills: string[];
  salaryRange: string;
  location: string;
  isSaved: boolean;
  isApplied: boolean;
}

interface ProfileCompletionItem {
  name: string;
  completed: boolean;
  progress: number;
}

interface Skill {
  name: string;
  level: number;
  verified: boolean;
  category: 'technical' | 'soft';
}

interface Milestone {
  title: string;
  date: string;
  icon: string;
  status: 'completed' | 'pending' | 'active';
  color: string;
}

interface AIInsight {
  id: string;
  message: string;
  action: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
}

interface RecentActivity {
  id: string;
  type: 'application' | 'view' | 'message' | 'alert';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
}

interface SavedJob {
  id: string;
  title: string;
  company: string;
  logo: string;
  deadline: Date;
  location: string;
}

interface Interview {
  id: string;
  company: string;
  role: string;
  date: Date;
  time: string;
  type: 'virtual' | 'in-person';
  joinLink?: string;
  location?: string;
  logo: string;
}

interface Document {
  id: string;
  name: string;
  type: 'resume' | 'cover-letter' | 'certificate' | 'portfolio';
  uploadDate: Date;
  size: string;
}

interface SalaryInsight {
  marketMin: number;
  marketMax: number;
  expectedSalary: number;
  confidence: number;
  topCompanies: string[];
  skillsToAdd: string[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: Date;
}

interface LearningItem {
  id: string;
  title: string;
  type: 'article' | 'video' | 'course';
  duration: string;
  thumbnail: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: Date;
  read: boolean;
}

@Component({
  selector: 'app-job-seeker-dashboard',
  templateUrl: './job-seeker-dashboard.component.html',
  styleUrls: ['./job-seeker-dashboard.component.css'],
})
export class JobSeekerDashboardComponent implements OnInit, AfterViewInit {
  // ============================================================================
  // PROPERTIES
  // ============================================================================
  
  user: any;
  isLoading = true;
  currentTime = new Date();
  greeting = '';
  
  @ViewChild('applicationTrendsChart') private applicationTrendsChartRef!: ElementRef;
  @ViewChild('categoryDistributionChart') private categoryChartRef!: ElementRef;
  @ViewChild('skillRadarChart') private skillRadarChartRef!: ElementRef;
  
  private trendsChart: Chart | null = null;
  private categoryChart: Chart | null = null;
  private skillChart: Chart | null = null;
  
  // Career Snapshots
  careerSnapshots: CareerSnapshot[] = [];
  
  // Application Status Stages
  applicationStages: ApplicationStage[] = [
    { name: 'Applied', count: 0, color: 'bg-blue-500', icon: 'file-text' },
    { name: 'Viewed', count: 0, color: 'bg-purple-500', icon: 'eye' },
    { name: 'Shortlisted', count: 0, color: 'bg-yellow-500', icon: 'star' },
    { name: 'Interview', count: 0, color: 'bg-orange-500', icon: 'video' },
    { name: 'Offer', count: 0, color: 'bg-green-500', icon: 'check-circle' },
  ];
  
  selectedStage: string | null = null;
  
  // Job Recommendations
  jobRecommendations: JobRecommendation[] = [];
  selectedFilter: 'skills' | 'location' | 'resume' | 'trending' | 'similar' = 'skills';
  
  // Profile Completion
  profileCompletionItems: ProfileCompletionItem[] = [
    { name: 'Bio', completed: false, progress: 0 },
    { name: 'Work Experience', completed: false, progress: 0 },
    { name: 'Skills', completed: false, progress: 0 },
    { name: 'Resume', completed: false, progress: 0 },
    { name: 'Projects', completed: false, progress: 0 },
    { name: 'Certifications', completed: false, progress: 0 },
  ];
  
  userApplications: any[] = [];
  filteredApplications: any[] = [];
  showApplicationsList: boolean = false;
  overallProfileCompletion = 0;
  
  // Skills
  skills: Skill[] = [];
  technicalSkills: Skill[] = [];
  softSkills: Skill[] = [];
  
  // Career Timeline
  milestones: Milestone[] = [];
  
  // AI Insights
  aiInsights: AIInsight[] = [];
  showAICoach = false;
  
  // Recent Activities
  recentActivities: RecentActivity[] = [];
  
  // Notifications
  notificationCount: number = 0;
  
  // Saved Jobs
  savedJobs: SavedJob[] = [];
  
  // Interviews
  upcomingInterviews: Interview[] = [];
  
  // Documents
  documents: Document[] = [];
  
  // Salary Insights
  salaryInsight: SalaryInsight | null = null;
  
  // Badges
  badges: Badge[] = [];
  
  // Learning
  learningItems: LearningItem[] = [];
  
  // Notifications
  notifications: Notification[] = [];
  unreadNotifications = 0;
  showNotifications = false;
  
  analyticsData = {
    applicationStats: {
      total: 0,
      successful: 0,
      rejected: 0,
      pending: 0,
      successRate: 0,
    },
    interviewMetrics: {
      total: 0,
      completed: 0,
      upcoming: 0,
      averageScore: 0,
    },
    jobCategories: {
      frontend: 0,
      backend: 0,
      fullstack: 0,
      devops: 0,
      other: 0,
    },
    monthlyApplications: {
      labels: [] as string[],
      data: [] as number[],
    },
  };

  integrations = {
    linkedin: false,
    calendar: false,
    videoConference: false,
    documents: false,
  };

  dashboardId: string = '';
  lastUpdated: string = '';

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(
    private jobPostingService: JobPostingService,
    private userService: UserService,
    private router: Router,
    private snackBar: MatSnackBar,
    private saveJobService: SaveJobService
  ) {}

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  ngOnInit(): void {
  this.setGreeting();
  this.loadDashboardData();
}

  ngAfterViewInit(): void {
    // if (!this.isLoading && this.analyticsData) {
    //   this.initializeCharts();
    // }
  }

  // ============================================================================
  // DATA LOADING METHODS
  // ============================================================================
  
  private setGreeting(): void {
    const hour = this.currentTime.getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 18) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    this.userService.findLoggedUser().then(
      (user) => {
        if (user && user._id) {
          this.user = user;
          this.loadRealDashboardData();        // ADD — user is guaranteed here
          // this.loadUserApplications(user._id); 
          this.userService.getAllDashboardData(user._id).subscribe({
            next: (response: DashboardResponse) => {
              this.analyticsData = response.analyticsData;
              this.integrations = response.integrations;
              this.dashboardId = response._id;
              this.lastUpdated = response.lastUpdated;
              
              // Update application stages from analytics
              // this.updateApplicationStages();
              this.updateCareerSnapshots();
              
              this.isLoading = false;
              
              setTimeout(() => {
                this.initializeCharts();
              }, 100);
            },
            error: (error: any) => {
              console.error('Error loading dashboard:', error);
              this.isLoading = false;
              this.snackBar.open('Failed to load dashboard data', 'Close', { 
                duration: 3000,
                panelClass: ['error-snackbar']
              });
            },
          });
        } else {
          this.isLoading = false;
          this.router.navigate(['/login']);
        }
      },
      (error) => {
        console.error('Error finding logged user:', error);
        this.isLoading = false;
        this.router.navigate(['/login']);
      }
    );
  }

  
  private loadUserApplications(userId: string): void {
  this.jobPostingService.getAllJobsAppliedByUser(userId).subscribe({
    next: (applications: any[]) => {
      this.userApplications = applications || [];
      // Deduplicate by jobPosting ID only
      const seen = new Set();
      this.userApplications = this.userApplications.filter(app => {
        if (!app.jobPosting) return true;
        const key = app.jobPosting.toString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      this.applicationStages[0].count = this.userApplications.length;
      this.applicationStages[1].count = this.userApplications.filter(a =>
        a.status?.toLowerCase() === 'viewed').length;
      this.applicationStages[2].count = this.userApplications.filter(a =>
        a.status?.toLowerCase() === 'shortlisted').length;
      this.applicationStages[3].count = this.userApplications.filter(a =>
        ['interview', 'interviewing'].includes(a.status?.toLowerCase())).length;
      this.applicationStages[4].count = this.userApplications.filter(a =>
        ['offer', 'accepted'].includes(a.status?.toLowerCase())).length;
      // Update isApplied on already-loaded recommendations
      this.markAppliedJobs();
    },
    error: (error) => { console.error('❌ Error loading applications:', error); }
  });
}

  // private updateApplicationStages(): void {
  //   this.applicationStages[0].count = this.analyticsData.applicationStats.total;
  //   this.applicationStages[1].count = Math.floor(this.analyticsData.applicationStats.total * 0.6);
  //   this.applicationStages[2].count = Math.floor(this.analyticsData.applicationStats.total * 0.3);
  //   this.applicationStages[3].count = this.analyticsData.interviewMetrics.upcoming;
  //   this.applicationStages[4].count = this.analyticsData.applicationStats.successful;
  // }

  // AFTER:
  private updateCareerSnapshots(): void {
    this.updateCareerSnapshotsWithRealData();
  }

  private loadMockData(): void {
    // Mock Job Recommendations
    this.jobRecommendations = [
      {
        id: '1',
        companyLogo: 'assets/companies/google.png',
        companyName: 'Google',
        jobTitle: 'Senior Frontend Engineer',
        matchScore: 94,
        missingSkills: ['GraphQL', 'WebAssembly'],
        salaryRange: '$120K - $180K',
        location: 'Mountain View, CA',
        isSaved: false,
        isApplied: false,
      },
      {
        id: '2',
        companyLogo: 'assets/companies/meta.png',
        companyName: 'Meta',
        jobTitle: 'React Developer',
        matchScore: 89,
        missingSkills: ['React Native'],
        salaryRange: '$110K - $160K',
        location: 'Menlo Park, CA',
        isSaved: true,
        isApplied: false,
      },
      {
        id: '3',
        companyLogo: 'assets/companies/microsoft.png',
        companyName: 'Microsoft',
        jobTitle: 'Full Stack Developer',
        matchScore: 87,
        missingSkills: ['Azure', 'C#'],
        salaryRange: '$115K - $170K',
        location: 'Seattle, WA',
        isSaved: false,
        isApplied: true,
      },
    ];

    // Mock Skills
    this.skills = [
      { name: 'JavaScript', level: 90, verified: true, category: 'technical' },
      { name: 'React', level: 85, verified: true, category: 'technical' },
      { name: 'TypeScript', level: 80, verified: false, category: 'technical' },
      { name: 'Node.js', level: 75, verified: true, category: 'technical' },
      { name: 'Communication', level: 88, verified: false, category: 'soft' },
      { name: 'Leadership', level: 70, verified: false, category: 'soft' },
    ];

    // Calculate profile completion
    this.calculateProfileCompletion();

    // Mock Milestones
    this.milestones = [
      { 
        title: 'Joined HiYrNow', 
        date: '2024-01-15', 
        icon: 'user-plus', 
        status: 'completed', 
        color: 'bg-green-500' 
      },
      { 
        title: 'Completed Profile', 
        date: '2024-02-01', 
        icon: 'check-circle', 
        status: 'completed', 
        color: 'bg-green-500' 
      },
      { 
        title: 'First Application', 
        date: '2024-02-10', 
        icon: 'file-text', 
        status: 'completed', 
        color: 'bg-green-500' 
      },
      { 
        title: 'Profile Viewed by Recruiter', 
        date: '2024-03-05', 
        icon: 'eye', 
        status: 'completed', 
        color: 'bg-blue-500' 
      },
      { 
        title: 'First Interview', 
        date: '2024-03-20', 
        icon: 'video', 
        status: 'active', 
        color: 'bg-purple-500' 
      },
      { 
        title: 'Receive Job Offer', 
        date: 'Pending', 
        icon: 'gift', 
        status: 'pending', 
        color: 'bg-gray-400' 
      },
    ];

    // Mock AI Insights
    this.aiInsights = [
      { 
        id: '1', 
        message: 'Add "TypeScript" to boost your profile by 15%', 
        action: 'Add Skill', 
        icon: 'lightbulb', 
        priority: 'high' 
      },
      { 
        id: '2', 
        message: 'Your resume is missing key projects', 
        action: 'Improve Resume', 
        icon: 'document', 
        priority: 'high' 
      },
      { 
        id: '3', 
        message: '5 new jobs match your profile', 
        action: 'View Jobs', 
        icon: 'briefcase', 
        priority: 'medium' 
      },
      { 
        id: '4', 
        message: 'Frontend Developer roles trending +23%', 
        action: 'Learn More', 
        icon: 'chart', 
        priority: 'low' 
      },
    ];

    // Mock Recent Activities
    this.recentActivities = [
      {
        id: '1',
        type: 'application',
        title: 'Applied to Google',
        description: 'Senior Frontend Engineer',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        icon: 'file-text',
      },
      {
        id: '2',
        type: 'view',
        title: 'Profile Viewed',
        description: 'Meta recruiter viewed your profile',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        icon: 'eye',
      },
      {
        id: '3',
        type: 'message',
        title: 'New Message',
        description: 'Microsoft sent you a message',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        icon: 'mail',
      },
      {
        id: '4',
        type: 'alert',
        title: 'Application Deadline',
        description: 'Amazon application due in 2 days',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
        icon: 'clock',
      },
    ];

    // Mock Saved Jobs
    this.savedJobs = [
      {
        id: '1',
        title: 'Senior React Developer',
        company: 'Netflix',
        logo: 'assets/companies/netflix.png',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        location: 'Los Gatos, CA',
      },
      {
        id: '2',
        title: 'Frontend Engineer',
        company: 'Airbnb',
        logo: 'assets/companies/airbnb.png',
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        location: 'San Francisco, CA',
      },
      {
        id: '3',
        title: 'UI Developer',
        company: 'Spotify',
        logo: 'assets/companies/spotify.png',
        deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        location: 'New York, NY',
      },
    ];

    // Mock Interviews
    this.upcomingInterviews = [
      {
        id: '1',
        company: 'Google',
        role: 'Senior Frontend Engineer',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        time: '10:00 AM',
        type: 'virtual',
        joinLink: 'https://meet.google.com/abc-defg-hij',
        logo: 'assets/companies/google.png',
      },
      {
        id: '2',
        company: 'Meta',
        role: 'React Developer',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        time: '2:00 PM',
        type: 'in-person',
        location: '1 Hacker Way, Menlo Park, CA',
        logo: 'assets/companies/meta.png',
      },
    ];

    // Mock Documents
    this.documents = [
      {
        id: '1',
        name: 'Resume_2024.pdf',
        type: 'resume',
        uploadDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        size: '245 KB',
      },
      {
        id: '2',
        name: 'Cover_Letter.docx',
        type: 'cover-letter',
        uploadDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        size: '128 KB',
      },
      {
        id: '3',
        name: 'AWS_Certificate.pdf',
        type: 'certificate',
        uploadDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        size: '512 KB',
      },
    ];

    // Mock Salary Insights
    this.salaryInsight = {
      marketMin: 80000,
      marketMax: 150000,
      expectedSalary: 115000,
      confidence: 87,
      topCompanies: ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple'],
      skillsToAdd: ['GraphQL', 'WebAssembly', 'Docker', 'Kubernetes'],
    };

    // Mock Badges
    this.badges = [
      {
        id: '1',
        name: 'Profile 100%',
        description: 'Complete your profile',
        icon: 'user-check',
        unlocked: false,
      },
      {
        id: '2',
        name: '5 Skills Verified',
        description: 'Verify 5 skills',
        icon: 'shield-check',
        unlocked: true,
        unlockedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        id: '3',
        name: '10 Applications',
        description: 'Apply to 10 jobs',
        icon: 'fire',
        unlocked: true,
        unlockedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: '4',
        name: 'Top Skill Percentile',
        description: 'Be in top 10% for a skill',
        icon: 'star',
        unlocked: false,
      },
    ];

    // Mock Learning Items
    this.learningItems = [
      {
        id: '1',
        title: 'Master GraphQL in 2024',
        type: 'course',
        duration: '4h 30m',
        thumbnail: 'assets/learning/graphql.jpg',
      },
      {
        id: '2',
        title: 'Ace Your Tech Interview',
        type: 'article',
        duration: '15 min',
        thumbnail: 'assets/learning/interview.jpg',
      },
      {
        id: '3',
        title: 'WebAssembly Fundamentals',
        type: 'video',
        duration: '45 min',
        thumbnail: 'assets/learning/wasm.jpg',
      },
    ];

    // Mock Notifications
    this.notifications = [
      {
        id: '1',
        title: 'Profile Viewed',
        message: 'Google recruiter viewed your profile',
        type: 'info',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        read: false,
      },
      {
        id: '2',
        title: 'New Job Match',
        message: 'New job matches your skills',
        type: 'success',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        read: false,
      },
      {
        id: '3',
        title: 'Interview Reminder',
        message: 'Your interview with Meta is in 2 days',
        type: 'warning',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        read: true,
      },
    ];

    this.unreadNotifications = this.notifications.filter(n => !n.read).length;
  }

  private calculateProfileCompletion(): void {
    // Mock calculation based on user data
    this.profileCompletionItems[0].completed = !!this.user?.bio;
    this.profileCompletionItems[0].progress = this.user?.bio ? 100 : 0;
    
    this.profileCompletionItems[1].completed = this.user?.experience?.length > 0;
    this.profileCompletionItems[1].progress = this.user?.experience?.length > 0 ? 100 : 0;
    
    this.profileCompletionItems[2].completed = this.skills.length >= 5;
    this.profileCompletionItems[2].progress = Math.min((this.skills.length / 5) * 100, 100);
    
    this.profileCompletionItems[3].completed = this.documents.some(d => d.type === 'resume');
    this.profileCompletionItems[3].progress = this.documents.some(d => d.type === 'resume') ? 100 : 0;
    
    this.profileCompletionItems[4].completed = this.user?.projects?.length > 0;
    this.profileCompletionItems[4].progress = this.user?.projects?.length > 0 ? 100 : 0;
    
    this.profileCompletionItems[5].completed = this.documents.some(d => d.type === 'certificate');
    this.profileCompletionItems[5].progress = this.documents.some(d => d.type === 'certificate') ? 100 : 0;

    const totalProgress = this.profileCompletionItems.reduce((sum, item) => sum + item.progress, 0);
    this.overallProfileCompletion = Math.round(totalProgress / this.profileCompletionItems.length);
  }

  // ============================================================================
  // CHART METHODS
  // ============================================================================
  
  private initializeCharts(): void {
    if (!this.applicationTrendsChartRef?.nativeElement || !this.categoryChartRef?.nativeElement) {
      console.warn('Chart references not yet available');
      return;
    }

    const trendsCanvas = this.applicationTrendsChartRef.nativeElement;
    const categoryCanvas = this.categoryChartRef.nativeElement;

    trendsCanvas.style.height = '300px';
    categoryCanvas.style.height = '300px';

    if (this.trendsChart) this.trendsChart.destroy();
    if (this.categoryChart) this.categoryChart.destroy();

    // Trends Chart
    const trendsConfig: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.analyticsData.monthlyApplications.labels,
        datasets: [
          {
            label: 'Applications',
            data: this.analyticsData.monthlyApplications.data,
            borderColor: '#6C63FF',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(108, 99, 255, 0.1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
      },
    };

    // Category Chart
    const categoryData: ChartData = {
      labels: Object.keys(this.analyticsData.jobCategories),
      datasets: [
        {
          data: Object.values(this.analyticsData.jobCategories),
          backgroundColor: [
            '#6C63FF',
            '#2ecc71',
            '#9b59b6',
            '#f1c40f',
            '#e74c3c',
          ],
        },
      ],
    };

    const categoriesConfig: ChartConfiguration = {
      type: 'doughnut',
      data: categoryData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
        },
      },
    };

    // Skill Radar Chart
    if (this.skillRadarChartRef?.nativeElement) {
      const skillCanvas = this.skillRadarChartRef.nativeElement;
      if (this.skillChart) this.skillChart.destroy();

      const skillConfig: ChartConfiguration = {
        type: 'radar',
        data: {
          labels: this.skills.slice(0, 6).map(s => s.name),
          datasets: [
            {
              label: 'Your Skills',
              data: this.skills.slice(0, 6).map(s => s.level),
              borderColor: '#6C63FF',
              backgroundColor: 'rgba(108, 99, 255, 0.2)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
            },
          },
        },
      };

      try {
        this.skillChart = new Chart(skillCanvas, skillConfig as any);
      } catch (error) {
        console.error('Error initializing skill chart:', error);
      }
    }

    try {
      this.trendsChart = new Chart(trendsCanvas, trendsConfig as any);
      this.categoryChart = new Chart(categoryCanvas, categoriesConfig as any);
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  }

  // ============================================================================
  // USER INTERACTION METHODS
  // ============================================================================
  
  // Application Stage Filter
  filterByStage(stage: string): void {
  if (this.selectedStage === stage) {
    this.selectedStage = null;
    this.showApplicationsList = false;
    this.filteredApplications = [];
  } else {
    this.selectedStage = stage;
    this.showApplicationsList = true;
    if (stage === 'Applied') {
      this.filteredApplications = this.userApplications;
    } else {
      this.filteredApplications = this.userApplications.filter(
        a => a.status?.toLowerCase() === stage.toLowerCase()
      );
    }
  }
}
  // Job Recommendations
  // AFTER:
  applyToJob(job: JobRecommendation): void {
  if (job.isApplied) return;

  // Capture values NOW — before any async that could replace the job reference
  const title = job.jobTitle || job['title'] || 'the job';
  const company = job.companyName || job['company'] || 'the company';
  const jobId = job.id || (job as any)._id;
  const location = job.location;

  const alreadyApplied = this.userApplications.some(app =>
    app.jobPosting && app.jobPosting.toString() === jobId?.toString()
  );

  if (alreadyApplied) {
    job.isApplied = true;
    return;
  }

  const jobApplication = {
    dateApplied: new Date(),
    status: 'applied',
    jobSource: 'HiYrNow',
    jobPosting: jobId,
    location: location || '',
    title: title,
    company: company
  };

  this.saveJobService.createJobApplication(jobApplication).then(() => {
    job.isApplied = true;
    this.applicationStages[0].count = (this.applicationStages[0].count || 0) + 1;
    if (this.user?._id) this.loadUserApplications(this.user._id);
    // Use captured values — NOT job.jobTitle which may be undefined after array replacement
    this.snackBar.open(`Applied to ${title} at ${company}`, 'Close', { duration: 3000 });
  }).catch((error) => {
    console.error('Error applying to job:', error);
    this.snackBar.open('Failed to apply. Please try again.', 'Close', { duration: 3000 });
  });
}

  saveJob(job: JobRecommendation): void {
    job.isSaved = !job.isSaved;
    const message = job.isSaved ? 'Job saved' : 'Job removed from saved';
    this.snackBar.open(message, 'Close', { duration: 2000 });
  }

  filterJobs(filter: 'skills' | 'location' | 'resume' | 'trending' | 'similar'): void {
    this.selectedFilter = filter;
    // Implement filtering logic here
    console.log('Filtering jobs by:', filter);
  }

  // AI Coach
  toggleAICoach(): void {
    this.showAICoach = !this.showAICoach;
  }

  handleAIAction(insight: AIInsight): void {
    console.log('Handling AI action:', insight.action);
    // Navigate to appropriate page based on action
  }

  // Notifications
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  markNotificationAsRead(notification: Notification): void {
    notification.read = true;
    this.unreadNotifications = this.notifications.filter(n => !n.read).length;
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.unreadNotifications = 0;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Navigation Methods
  navigateToJobs(): void {
    this.router.navigate(['/job-list']);
}

  // ✅ FIX — pass user._id to match the route 'profile/:userId'
  navigateToProfile(): void {
    if (this.user && this.user._id) {
      this.router.navigate(['/profile', this.user._id]);
    }
  }

  navigateToResume(): void {
    if (this.user && this.user._id) {
      this.router.navigate(['/profile', this.user._id], {
        fragment: 'resume'
      });
    }
  }

  navigateToSkillTest(): void {
    if (this.user && this.user._id) {
      this.router.navigate(['/profile', this.user._id], {
        fragment: 'skills'
      });
    }
  }

  navigateToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  // Document Management
  uploadDocument(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.doc,.docx';
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        // Handle file upload
        this.snackBar.open('Document uploaded successfully', 'Close', { duration: 3000 });
      }
    };
    fileInput.click();
  }

  deleteDocument(doc: Document): void {
    this.documents = this.documents.filter(d => d.id !== doc.id);
    this.snackBar.open('Document deleted', 'Close', { duration: 2000 });
  }

  // Saved Jobs Management
  removeSavedJob(job: SavedJob): void {
    this.savedJobs = this.savedJobs.filter(j => j.id !== job.id);
    this.snackBar.open('Job removed from saved', 'Close', { duration: 2000 });
  }

  applyToSavedJob(job: SavedJob): void {
  const jobId = job.id?.toString();
  if (!jobId) {
    this.snackBar.open('Unable to open job. Missing job ID.', 'Close', { duration: 3000 });
    return;
  }
  this.router.navigate(['/job', jobId]);
}
  // Interview Management
  joinInterview(interview: Interview): void {
    if (interview.joinLink) {
      window.open(interview.joinLink, '_blank');
    }
  }

  startMockInterview(): void {
    this.router.navigate(['/mock-interview']);
  }

  // Utility Methods
  getDaysUntil(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 0;
  const diff = d.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // AFTER — guard against non-Date values:
  getTimeAgo(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).format(new Date(date));
  }

  formatSalary(amount: number): string {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Integration Methods (from original code)
  connectLinkedIn(): void {
    sessionStorage.removeItem('linkedInState');

    this.userService.initiateLinkedInAuth().subscribe({
        next: (response) => {
            if (response?.success && response?.authUrl && typeof response.state === 'string') {
                sessionStorage.setItem('linkedInState', response.state);

                const linkedInWindow = window.open(
                    response.authUrl,
                    'LinkedIn Login',
                    'width=600,height=600,scrollbars=yes'
                );

                const messageHandler = (event: MessageEvent) => {
                    if (event.data.type === 'linkedin_auth') {
                        window.removeEventListener('message', messageHandler);
                        linkedInWindow?.close();

                        const storedState = sessionStorage.getItem('linkedInState');
                        if (!storedState || event.data.state !== storedState) {
                            this.handleLinkedInError('State validation failed');
                            return;
                        }

                        this.userService.handleLinkedInCallback(event.data.code, storedState)
                            .subscribe({
                                next: (response) => {
                                    if (response?.success) {
                                        this.handleLinkedInSuccess(response);
                                    } else {
                                        this.handleLinkedInError('Integration failed');
                                    }
                                },
                                error: (error) => this.handleLinkedInError(error.message)
                            });
                    }
                };

                window.addEventListener('message', messageHandler);

                const checkWindow = setInterval(() => {
                    if (linkedInWindow?.closed) {
                        clearInterval(checkWindow);
                        window.removeEventListener('message', messageHandler);
                        sessionStorage.removeItem('linkedInState');
                    }
                }, 1000);
            } else {
                this.handleLinkedInError('Invalid response from LinkedIn auth');
            }
        },
        error: (error) => this.handleLinkedInError(error.message)
    });
}

private handleLinkedInSuccess(response: any): void {
    this.integrations.linkedin = true;
    this.snackBar.open('Successfully connected to LinkedIn!', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
    });
    this.loadDashboardData();
}

private handleLinkedInError(errorMessage: string): void {
    console.error('LinkedIn connection failed:', errorMessage);
    this.snackBar.open(`LinkedIn connection failed: ${errorMessage}`, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
    });
    sessionStorage.removeItem('linkedInState');
}

  syncCalendar(): void {
    // Calendar sync implementation
    this.snackBar.open('Calendar sync feature coming soon', 'Close', { duration: 3000 });
  }

  configureVideoConference(): void {
    // Video conference setup
    this.snackBar.open('Video conference setup coming soon', 'Close', { duration: 3000 });
  }

  verifyDocuments(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.pdf,.doc,.docx';

    fileInput.onchange = (event: any) => {
      const files = event.target.files;
      if (files.length) {
        this.userService.uploadDocuments(Array.from(files)).subscribe({
          next: (response) => {
            this.integrations.documents = true;
            this.snackBar.open('Documents verified successfully', 'Close', { duration: 3000 });
          },
          error: (error) => {
            this.snackBar.open('Document verification failed', 'Close', { duration: 3000 });
            console.error('Document verification error:', error);
          }
        });
      }
    };

    fileInput.click();
  }

  // ============================================================================
  // NEW REAL API INTEGRATION METHODS
  // ============================================================================

  /**
   * Load all real dashboard data from APIs
   * Called after dashboard data loads to populate all sections
   */
  private loadRealDashboardData(): void {
  if (!this.user || !this.user._id) return;

  this.userService.getAllDashboardData(this.user._id).subscribe({
    next: (data) => {
      // Applications — deduplicate by jobPosting ID, then exclude saved jobs
      // to match the exact same logic used in the Applied Jobs page (isSaved filter)
      let apps = data.applications || [];
      const seen = new Set();
      this.userApplications = apps
        .filter((app: any) => {
          if (!app.jobPosting) return true;
          const key = app.jobPosting.toString();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .filter((app: any) => !app.isSaved); // ← exclude saved jobs to match Applied Jobs page

      this.applicationStages[0].count = this.userApplications.length;
      this.applicationStages[1].count = this.userApplications.filter((a: any) => a.status?.toLowerCase() === 'viewed').length;
      this.applicationStages[2].count = this.userApplications.filter((a: any) => a.status?.toLowerCase() === 'shortlisted').length;
      this.applicationStages[3].count = this.userApplications.filter((a: any) => ['interview', 'interviewing'].includes(a.status?.toLowerCase())).length;
      this.applicationStages[4].count = this.userApplications.filter((a: any) => ['offer', 'accepted'].includes(a.status?.toLowerCase())).length;

      this.savedJobs        = (data.savedJobs || []).slice(0, 3);
      this.notifications    = data.notifications || [];
      this.notificationCount = data.unreadCount || 0;

      this.profileCompletionItems   = data.profileCompletionItems || [];
      this.overallProfileCompletion = data.overallCompletion || 0;

      this.skills          = data.skills || [];
      this.technicalSkills = data.technicalSkills || [];
      this.softSkills      = data.softSkills || [];

      this.milestones      = data.milestones || [];
      this.salaryInsight   = data.salaryInsight;
      this.badges          = data.badges || [];
      this.learningItems   = data.learningItems || [];
      this.recentActivities = data.recentActivities || [];
      this.aiInsights      = data.aiInsights || [];

      this.updateCareerSnapshotsWithRealData();
      this.markAppliedJobs();
    },
    error: (err) => {
      console.error('❌ Combined dashboard load failed:', err);
    }
  });
}

  /**
   * Load job recommendations from API with current filter
   */
  private loadJobRecommendations(userId: string): void {
    this.userService.getMatchedJobs(userId).subscribe({
      next: (response) => {
        if (response && response.matchedJobs) {
          this.jobRecommendations = response.matchedJobs;
        } else if (response.success && response.recommendations) {
          this.jobRecommendations = response.recommendations;
        }
        // Always re-mark after recommendations load, regardless of which resolved first
        this.markAppliedJobs();
      },
      error: (error) => { console.error('❌ Error loading recommendations:', error); },
    });
  }
  
  private markAppliedJobs(): void {
  const appliedJobIds = new Set(
    (this.userApplications || [])
      .filter(app => app.jobPosting)
      .map(app => app.jobPosting.toString())
  );
  this.jobRecommendations = this.jobRecommendations.map(job => ({
    ...job,
    isApplied: job.isApplied || appliedJobIds.has((job.id || (job as any)._id)?.toString())
  }));
}


  /**
   * Load saved jobs from API
   */
  private loadSavedJobs(userId: string): void {
    this.userService.getSavedJobs(userId).subscribe({
      next: (response) => {
        if (response.success && response.savedJobs) {
          this.savedJobs = response.savedJobs.slice(0, 3); // Top 3 for widget
          console.log('✅ Saved jobs loaded:', this.savedJobs.length);
        }
      },
      error: (error) => {
        console.error('❌ Error loading saved jobs:', error);
      },
    });
  }

  /**
   * Load notifications from API
   */
  private loadNotifications(userId: string): void {
    this.userService.getNotifications(userId, false, 20).subscribe({
      next: (response) => {
        if (response.success && response.notifications) {
          this.notifications = response.notifications;
          this.notificationCount = response.unreadCount || 0;
          console.log('✅ Notifications loaded:', this.notifications.length, 'Unread:', this.notificationCount);
        }
      },
      error: (error) => {
        console.error('❌ Error loading notifications:', error);
      },
    });
  }

  /**
   * Load profile completion from API
   */
  private loadProfileCompletion(userId: string): void {
    this.userService.getProfileCompletion(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.profileCompletionItems = response.profileCompletionItems;
          this.overallProfileCompletion = response.overallCompletion;
          console.log('✅ Profile completion loaded:', this.overallProfileCompletion + '%');
          
          // Update career snapshots with real data
          this.updateCareerSnapshotsWithRealData();
        }
      },
      error: (error) => {
        console.error('❌ Error loading profile completion:', error);
      },
    });
  }

  /**
   * Load skills from API
   */
  private loadSkills(userId: string): void {
    this.userService.getSkillsOverview(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.skills = response.skills;
          this.technicalSkills = response.technicalSkills || [];
          this.softSkills = response.softSkills || [];
          console.log('✅ Skills loaded:', this.skills.length, 'Technical:', this.technicalSkills.length, 'Soft:', this.softSkills.length);
        }
      },
      error: (error) => {
        console.error('❌ Error loading skills:', error);
      },
    });
  }

  /**
   * Load career milestones from API
   */
  private loadMilestones(userId: string): void {
    this.userService.getCareerMilestones(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.milestones = response.milestones;
          console.log('✅ Milestones loaded:', this.milestones.length);
        }
      },
      error: (error) => {
        console.error('❌ Error loading milestones:', error);
      },
    });
  }

  /**
   * Load salary insights from API
   */
  private loadSalaryInsights(userId: string): void {
    this.userService.getSalaryInsights(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.salaryInsight = response.salaryInsight;
          console.log('✅ Salary insights loaded');
          
          // Update career snapshots with real salary data
          if (this.careerSnapshots && this.careerSnapshots.length > 3 && this.salaryInsight?.expectedSalary) {
            this.careerSnapshots[3].value = `$${(this.salaryInsight.expectedSalary / 1000).toFixed(0)}K`;
          }
        }
      },
      error: (error) => {
        console.error('❌ Error loading salary insights:', error);
      },
    });
  }

  /**
   * Load badges from API
   */
  private loadBadges(userId: string): void {
    this.userService.getBadges(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.badges = response.badges;
          console.log('✅ Badges loaded:', this.badges.length, 'Unlocked:', response.unlockedCount);
        }
      },
      error: (error) => {
        console.error('❌ Error loading badges:', error);
      },
    });
  }

  /**
   * Load learning resources from API
   */
  private loadLearningResources(userId: string): void {
    this.userService.getLearningResources(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.learningItems = response.learningItems;
          console.log('✅ Learning resources loaded:', this.learningItems.length);
        }
      },
      error: (error) => {
        console.error('❌ Error loading learning resources:', error);
      },
    });
  }

  /**
   * Load recent activities from API
   */
  private loadRecentActivities(userId: string): void {
    this.userService.getRecentActivities(userId, 10).subscribe({
      next: (response) => {
        if (response.success) {
          this.recentActivities = response.recentActivities;
          console.log('✅ Recent activities loaded:', this.recentActivities.length);
        }
      },
      error: (error) => {
        console.error('❌ Error loading activities:', error);
      },
    });
  }

  /**
   * Load AI insights from API
   */
  private loadAIInsights(userId: string): void {
    this.userService.getAIInsights(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.aiInsights = response.aiInsights;
          console.log('✅ AI insights loaded:', this.aiInsights.length, 'High priority:', response.highPriority);
        }
      },
      error: (error) => {
        console.error('❌ Error loading AI insights:', error);
      },
    });
  }

  /**
   * Update career snapshots with real data
   */
  // AFTER — Calculate resume strength from real profile data:
  private updateCareerSnapshotsWithRealData(): void {
  // Calculate resume strength from actual profile data
  let resumeStrength = 0;
  if (this.user?.firstName && this.user?.lastName) resumeStrength += 20;
  if (this.user?.tagline) resumeStrength += 15;
  if (this.skills && this.skills.length > 0) resumeStrength += 20;
  if (this.user?.resumeUrl) resumeStrength += 25;
  if (this.user?.linkedin || this.user?.github) resumeStrength += 10;
  if (this.user?.currentCity) resumeStrength += 10;

  // Calculate market demand from skills count
  const skillCount = this.skills?.length || 0;
  const marketDemand = skillCount >= 5 ? 'High' : skillCount >= 3 ? 'Medium' : 'Low';

  this.careerSnapshots = [
    { 
      label: 'Resume Strength', 
      value: `${Math.min(resumeStrength, 100)}%`,
      icon: 'document', 
      color: 'from-blue-500 to-blue-600' 
    },
    { 
      label: 'Profile Completion', 
      value: `${this.overallProfileCompletion}%`,
      icon: 'user', 
      color: 'from-purple-500 to-purple-600' 
    },
    { 
      label: 'Market Demand', 
      value: marketDemand,
      icon: 'trending-up', 
      color: 'from-green-500 to-green-600' 
    },
    { 
      label: 'Expected Salary', 
      value: this.salaryInsight?.expectedSalary 
        ? `$${(this.salaryInsight.expectedSalary / 1000).toFixed(0)}K`
        : 'N/A',
      icon: 'currency-dollar', 
      color: 'from-yellow-500 to-yellow-600' 
    },
  ];
}

  /**
   * Enhanced save job method with API integration
   */
  saveJobEnhanced(job: JobRecommendation): void {
    if (!this.user || !this.user._id) {
      this.snackBar.open('Please log in to save jobs', 'Close', { duration: 3000 });
      return;
    }

    this.userService.saveJob(this.user._id, job.id || (job as any)._id).subscribe({
      next: (response) => {
        if (response.success) {
          job.isSaved = true;
          this.snackBar.open('✅ Job saved successfully!', 'Close', { 
            duration: 2000,
            panelClass: ['success-snackbar']
          });
          
          // Reload saved jobs
          this.loadSavedJobs(this.user._id);
        }
      },
      error: (error) => {
        console.error('Error saving job:', error);
        this.snackBar.open('❌ Failed to save job', 'Close', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      },
    });
  }

  /**
   * Enhanced remove saved job with API integration
   */
  removeSavedJobEnhanced(jobId: string): void {
    if (!this.user || !this.user._id) return;

    this.userService.removeSavedJob(this.user._id, jobId).subscribe({
      next: (response) => {
        if (response.success) {
          this.savedJobs = this.savedJobs.filter(job => job.id !== jobId);
          
          // Update job recommendation status
          const job = this.jobRecommendations.find(j => j.id === jobId);
          if (job) {
            job.isSaved = false;
          }
          
          this.snackBar.open('✅ Job removed from saved', 'Close', { 
            duration: 2000,
            panelClass: ['success-snackbar']
          });
        }
      },
      error: (error) => {
        console.error('Error removing saved job:', error);
        this.snackBar.open('❌ Failed to remove job', 'Close', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      },
    });
  }

  /**
   * Enhanced mark notification as read with API integration
   */
  markNotificationAsReadEnhanced(notificationId: string): void {
    if (!this.user || !this.user._id) return;

    this.userService.markNotificationAsRead(this.user._id, notificationId).subscribe({
      next: (response) => {
        if (response.success) {
          const notification = this.notifications.find(n => n.id === notificationId);
          if (notification) {
            notification.read = true;
            this.notificationCount = Math.max(0, this.notificationCount - 1);
          }
        }
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      },
    });
  }

  /**
   * Reload recommendations with new filter (enhanced with API)
   */
  onFilterChangeEnhanced(filter: 'skills' | 'location' | 'resume' | 'trending' | 'similar'): void {
    this.selectedFilter = filter;
    console.log('🔄 Changing filter to:', filter);
    
    if (this.user && this.user._id) {
      this.userService.getMatchedJobs(this.user._id).subscribe({
        next: (response) => {
          if (response && response.matchedJobs) {
            this.jobRecommendations = response.matchedJobs;
            console.log(`✅ Matched jobs loaded:`, this.jobRecommendations.length);
            this.snackBar.open(`Loaded ${this.jobRecommendations.length} matched jobs`, 'Close', { 
              duration: 2000 
            });
          } else if (response.success && response.recommendations) {
            // Fallback for old API response format
            this.jobRecommendations = response.recommendations;
            console.log(`✅ Recommendations filtered by ${filter}:`, this.jobRecommendations.length);
            this.snackBar.open(`Loaded ${this.jobRecommendations.length} ${filter} recommendations`, 'Close', { 
              duration: 2000 
            });
          }
        },
        error: (error) => {
          console.error('Error loading matched jobs:', error);
          this.snackBar.open('Failed to load job recommendations', 'Close', { 
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        },
      });
    } else {
      // Fallback to existing filter method if no user
      this.filterJobs(filter);
    }
  }
  //NEW (VIEW BUTTON)
  viewJobDetails(job: JobRecommendation): void {
  const jobId = job.id || (job as any)._id;
  if (!jobId) {
    this.snackBar.open('Unable to load job details', 'Close', { duration: 2000 });
    return;
  }
  this.router.navigate(['/dashboard-seeker/view-job', jobId]);
}
  /**
   * Refresh all dashboard data
   */
  refreshDashboard(): void {
    console.log('🔄 Refreshing dashboard...');
    this.isLoading = true;
    
    this.loadDashboardData();
    
    setTimeout(() => {
      if (this.user && this.user._id) {
        this.loadRealDashboardData();
      }
      this.isLoading = false;
      this.snackBar.open('✅ Dashboard refreshed', 'Close', { duration: 2000 });
    }, 1000);
  }
}


