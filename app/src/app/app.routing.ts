import { RouterModule, Routes } from '@angular/router';
import { JobBoardComponent } from './components/job-board/job-board.component';
import { JobListComponent } from './components/job-list/job-list.component';
import { LoginComponent } from './components/login/login.component';
import { RoleSelectorComponent } from './components/role-selector/role-selector.component';
import { AuthOptionsComponent } from './components/auth-options/auth-options.component';
import { JobseekerRegisterComponent } from './components/jobseeker-register/jobseeker-register.component';
import { RecruiterRegisterComponent } from './components/recruiter-register/recruiter-register.component';
import { ProfileRecruiterComponent } from './components/profile-recruiter/profile-recruiter.component';
import { ProfileSeekerComponent } from './components/profile-seeker/profile-seeker.component';
import { ViewJobComponent } from './components/view-job/view-job.component';
import { RegisterComponent } from './components/register/register.component';
import { AdminComponent } from './components/admin/admin.component';
import { PostJobComponent } from './components/post-job/post-job.component';
import { JobSeekerDashboardComponent } from './components/job-seeker-dashboard/job-seeker-dashboard.component';
import { RecruiterDashboardComponent } from './components/recruiter-dashboard/recruiter-dashboard.component';
import { UserProfileShareComponent } from './components/user-profile-share/user-profile-share.component';
import { AboutComponent } from './components/about/about.component';
import { PricingComponent } from './components/pricing/pricing.component';
import { AskComponent } from './components/ask/ask.component';
import { PVCListComponent } from './components/pvc-list/pvc-list.component';
import { AppliedJobsListComponent } from './components/applied-jobs-list/applied-jobs-list.component';
import { SitemapComponent } from './components/sitemap/sitemap.component';
import { EmployerRegisterComponent } from './components/employer-register/employer-register.component';
import { EditJobPostingComponent } from './components/edit-job-posting/edit-job-posting.component';
import { JobApplicationComponent } from './components/job-application/job-application.component';
import { MatchedProfileViewComponent } from './components/matched-profile-view/matched-profile-view.component';
import { CompanayJobListComponent } from './components/companay-job-list/companay-job-list.component';
import { CreditPointsComponent } from './components/credit-points/credit-points.component';
import { SettingsComponent } from './components/settings/settings.component';
import { UsersListComponent } from './components/users-list/users-list.component';
import { CompanyPublicProfileComponent } from './components/company-public-profile/company-public-profile.component';
import { PasswordResetComponent } from './components/password-reset/password-reset.component';
import { AdminBlogComponent } from './components/admin-blog/admin-blog.component';
import { BlogComponent } from './components/blog/blog.component';
import { BlogDetailComponent } from './components/blog-detail/blog-detail.component';
import { JobApplicationDetailsComponent } from './components/job-application-details/job-application-details.component';
import { SignupComponent } from './components/signup/signup.component';
import { ManageJobComponent } from './components/manage-job/manage-job.component';
import { DemoFormComponent } from './components/demo-form/demo-form.component';
import { SummitSignupComponent } from './components/summit-signup/summit-signup.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { TermsConditionsComponent } from './components/terms-conditions/terms-conditions.component';
import { CookiesPolicyComponent } from './components/cookies-policy/cookies-policy.component';
import { ContactComponent } from './components/contact/contact.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { AdminJobsComponent } from './components/admin-jobs/admin-jobs.component';
import { AdminPlansComponent } from './components/admin-plans/admin-plans.component';
import { AdminAnalyticsComponent } from './components/admin-analytics/admin-analytics.component';
import { AdminSettingsComponent } from './components/admin-settings/admin-settings.component';
import { CompanyDashboardComponent } from './components/company-dashboard/company-dashboard.component';
import { PlanUsageComponent } from './components/plan-usage/plan-usage.component';
import { AdminReferralsComponent } from './components/admin-referrals/admin-referrals.component';
import { PaymentSuccessComponent } from './components/payment-success/payment-success.component';
import { PaymentFailedComponent } from './components/payment-failed/payment-failed.component';
import { OfflinePageComponent } from './components/offline-page/offline-page.component';
import { SummitLandingComponent } from './summit-landing/summit-landing.component';
import { SummitWelcomeComponent } from './summit-landing/summit-welcome.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  // { path: '', redirectTo: '/chats', pathMatch: 'full' },
  { path: 'password-reset', component: PasswordResetComponent },
  // Optionally, add a route for handling the reset token
  { path: 'reset-password/:token', component: PasswordResetComponent },
  { path: 'onboarding', component: OnboardingComponent },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'company-dashboard', component: CompanyDashboardComponent },
  {
    path: 'home',
    component: SummitLandingComponent,
    data: {
      title: 'Find Your Dream Job | HiYrNow - Leading Job Portal',
      description:
        'Discover thousands of job opportunities across various industries. Search, apply, and connect with top employers on HiYrNow - your trusted job search platform.',
      keywords:
        'job search, career opportunities, employment, job portal, find jobs, job listings, career growth',
    },
  },
  {
    path: 'blog/:id',
    component: BlogDetailComponent,
    data: {
      title: 'Career Insights & Industry News | HiYrNow Blog',
      description:
        'Stay updated with the latest career advice, industry trends, and professional development tips from our expert contributors.',
      keywords:
        'career advice, industry news, professional development, job search tips, career growth, employment trends',
    },
  },

  {
    path: 'blogs',
    component: BlogComponent,
    data: {
      title: 'Career Resources & Industry Insights | HiYrNow Blog',
      description:
        'Explore our comprehensive collection of career resources, job search strategies, and industry insights to advance your professional journey.',
      keywords:
        'career resources, job search strategies, industry insights, professional development, career advice',
    },
  },
  {
    path: 'admin/blog',
    component: AdminBlogComponent,
    data: {
      title: 'Blog Management Dashboard | HiYrNow Admin',
      description:
        'Manage and publish engaging content for our career resources and industry insights blog.',
      keywords:
        'blog management, content management, admin dashboard, career resources',
    },
  },

  {
    path: 'demo',
    component: DemoFormComponent,
    data: {
      title: 'Employer-register',
      description:
        'Welcome to hiyrnow. Find the latest job openings and employment opportunities.',
      keywords: 'job portal, job search, career opportunities',
    },
  },
  {
    path: 'summit',
    component: SummitLandingComponent,
    data: {
      title: 'Hire 5× faster — Summit AI for recruiters | HiYrNow',
      description:
        'Summit landing for HiYrNow: get instant access to our AI hiring demo, built for skill-first recruiting teams.',
      keywords: 'summit, ai recruiting, skills-based hiring',
    },
  },
  {
    path: 'summit/welcome',
    component: SummitLandingComponent,
  },
  {
    path: 'events/signup',
    component: SummitSignupComponent,
    data: {
      title: 'Summit Registration | HiYrNow',
      description:
        'Register for the summit with your company details and get instant access to the dashboard.',
      keywords: 'summit signup, company registration, dashboard access',
    },
  },
  {
    path: 'employer-register',
    component: EmployerRegisterComponent,
    data: {
      title: 'Employer Registration | Post Jobs on HiYrNow',
      description:
        'Join HiYrNow as an employer and access our premium talent pool. Post jobs, manage applications, and find the perfect candidates for your organization.',
      keywords:
        'employer registration, post jobs, hire talent, recruitment, employer dashboard',
    },
  },
  {
    path: 'Matched-Profile/:userId/:jobId',
    component: MatchedProfileViewComponent,
    data: {
      title: 'Candidate Profile Match | HiYrNow',
      description:
        'View detailed candidate profile matches for your job postings and make informed hiring decisions.',
      keywords:
        'candidate matching, profile view, job matching, recruitment, hiring',
    },
  },
  {
    path: 'Post-job',
    component: PostJobComponent,
    data: {
      title: 'Post a Job | Find Qualified Candidates | HiYrNow',
      description:
        'Create and publish your job posting to reach thousands of qualified candidates. Our platform helps you find the perfect match for your organization.',
      keywords:
        'post jobs, job posting, recruitment, hiring, employer services',
    },
  },
  { path: 'sitemap', component: SitemapComponent },
  {
    path: 'ApplicationDetails/:applicationId',
    component: JobApplicationDetailsComponent,
  },
  {
    path: 'about',
    component: AboutComponent,
    data: {
      title: 'About HiYrNow | Connecting Talent with Opportunity',
      description:
        'Learn about our mission to transform the job search experience. Discover how HiYrNow connects talented professionals with leading employers worldwide.',
      keywords:
        'about us, company mission, job platform, career services, employment solutions',
    },
  },
  {
    path: 'help',
    component: AskComponent,
    data: {
      title: 'Help Center & Support | HiYrNow',
      description:
        'Get assistance with your job search or recruitment needs. Our comprehensive help center provides answers to all your questions.',
      keywords:
        'help center, support, FAQ, job search help, recruitment support',
    },
  },
  {
    path: 'plan',
    component: PlanUsageComponent,
    data: {
      title: 'Plan Usage | HiYrNow',
      description: 'View your plan usage and manage your plan.',
      keywords: 'plan usage, plan management, hiyrnow',
    },
  },
  {
    path: 'pricing',
    component: PricingComponent,
    data: {
      title: 'Pricing Plans | Premium Recruitment Solutions | HiYrNow',
      description:
        'Choose the perfect plan for your recruitment needs. Our flexible pricing options cater to businesses of all sizes.',
      keywords:
        'pricing plans, recruitment solutions, employer services, job posting costs',
    },
  },
  { path: 'payment-success', component: PaymentSuccessComponent },
  { path: 'payment-failed', component: PaymentFailedComponent },
  { 
    path: 'offline', 
    component: OfflinePageComponent,
    data: {
      title: 'You are Offline | HiYrNow',
      description: 'You are currently offline. Some features may be limited.',
      keywords: 'offline, no connection, pwa'
    }
  },
  {
    path: 'admin',
    component: AdminComponent,
    data: {
      title: 'Admin Dashboard | HiYrNow Management',
      description:
        'Manage your HiYrNow platform with our comprehensive admin dashboard. Monitor activity, manage users, and oversee platform operations.',
      keywords:
        'admin dashboard, platform management, user management, system administration',
    },
  },
  { path: 'admin/users', component: AdminUsersComponent },
  { path: 'admin/jobs', component: AdminJobsComponent },
  { path: 'admin/plans', component: AdminPlansComponent },
  { path: 'admin/analytics', component: AdminAnalyticsComponent },
  { path: 'admin/referrals', component: AdminReferralsComponent },
  { path: 'admin/settings', component: AdminSettingsComponent },
  {
    path: 'admin/referrals',
    component: AdminReferralsComponent,
    data: {
      title: 'Referral Management | HiYrNow Admin',
      description:
        'Manage partner referral codes and track their performance. Create, edit, and monitor referral campaigns.',
      keywords:
        'referral management, partner codes, admin dashboard, referral tracking',
    },
  },
  {
    path: 'PVC-candidates',
    component: PVCListComponent,
    data: {
      title: 'PVC Candidates - hiyrnow',
      description: 'View the list of PVC candidates on hiyrnow.',
      keywords: 'PVC candidates, job candidates, hiyrnow',
    },
  },
  {
    path: 'role-selector',
    component: RoleSelectorComponent,
    data: {
      title: 'Get Started | HiYrNow',
      description: 'Choose your role to get started with HiYrNow',
      keywords: 'sign up, registration, job seeker, recruiter',
    },
  },
  {
    path: 'auth-options',
    component: AuthOptionsComponent,
    data: {
      title: 'Sign Up Options | HiYrNow',
      description: 'Choose how you want to sign up for HiYrNow',
      keywords: 'sign up, registration, social login',
    },
  },
  {
    path: 'register',
    component: RoleSelectorComponent,
    data: {
      title: 'Create Your Account | Join HiYrNow',
      description:
        'Sign up for a HiYrNow account and unlock access to thousands of job opportunities and career resources.',
      keywords:
        'sign up, create account, job seeker registration, career platform',
    },
  },
  {
    path: 'register/jobseeker',
    component: JobseekerRegisterComponent,
    data: {
      title: 'Jobseeker Registration | HiYrNow',
      description: 'Create your jobseeker account on HiYrNow',
      keywords: 'job seeker registration, create account',
    },
  },
  {
    path: 'register/recruiter',
    component: RecruiterRegisterComponent,
    data: {
      title: 'Recruiter Registration | HiYrNow',
      description: 'Create your recruiter account on HiYrNow',
      keywords: 'recruiter registration, employer signup',
    },
  },
  {
    path: 'edit-job/:id',
    component: EditJobPostingComponent,
  },
  {
    path: 'edit-job-posting/:id',
    component: PostJobComponent,
    data: {
      title: 'Edit Job Posting | Update Your Job | HiYrNow',
      description:
        'Edit and update your job posting details. Modify requirements, description, and other job information.',
      keywords:
        'edit job, update job posting, modify job, job editing, recruitment',
    },
  },
  {
    path: 'Company/:userId',
    component: CompanyPublicProfileComponent,
  },
  {
    path: 'job/manage/:id',
    component: ManageJobComponent,
    data: {
      title: 'Job Details - hiyrnow',
      description: 'View job details on hiyrnow.',
      keywords: 'job details, job listing, hiyrnow',
    },
  },
  {
    path: 'job/:id',
    component: ViewJobComponent,
    data: {
      title: 'Job Details - hiyrnow',
      description: 'View job details on hiyrnow.',
      keywords: 'job details, job listing, hiyrnow',
    },
  },
  { path: 'credits', component: CreditPointsComponent },

  { path: 'settings', component: SettingsComponent },
  { path: 'Alluser', component: UsersListComponent },
  {
    path: 'company/job-postings',
    component: CompanayJobListComponent,
    data: {
      title: 'Job Details - hiyrnow',
      description: 'View job details on hiyrnow.',
      keywords: 'job details, job listing, hiyrnow',
    },
  },
  
  {
    path: 'login',
    component: LoginComponent,
    data: {
      title: 'Login to Your Account | HiYrNow',
      description:
        'Access your HiYrNow account to manage your job search, applications, and profile.',
      keywords: 'login, sign in, account access, job portal login',
    },
  },
  {
    path: 'company/profile',
    component: ProfileRecruiterComponent,
    data: {
      title: 'Company Profile Management | HiYrNow',
      description:
        'Manage and optimize your company profile to attract top talent and showcase your organization.',
      keywords:
        'company profile, employer branding, recruitment profile, company management',
    },
  },
  {
    path: 'company/profile/:userId',
    component: ProfileRecruiterComponent,
    data: {
      title: 'Company Profile | HiYrNow',
      description: 'View company profile and information.',
      keywords: 'company profile, employer profile, company information',
    },
  },
  {
    path: 'profile/:userId',
    component: ProfileSeekerComponent,
    data: {
      title: 'Professional Profile | HiYrNow',
      description:
        'Create and manage your professional profile to showcase your skills and experience to potential employers.',
      keywords:
        'professional profile, job seeker profile, career profile, skills showcase',
    },
  },
  {
    path: 'company/dashboard',
    component: RecruiterDashboardComponent,
    data: {
      title: 'Recruiter Dashboard | Manage Job Postings | HiYrNow',
      description:
        'Efficiently manage your job postings, applications, and recruitment process through our comprehensive recruiter dashboard.',
      keywords:
        'recruiter dashboard, job management, application tracking, recruitment tools',
    },
  },
  {
    path: 'dashboard-seeker',
    component: JobSeekerDashboardComponent,
    data: {
      title: 'Job Seeker Dashboard | Track Applications | HiYrNow',
      description:
        'Manage your job applications, track responses, and organize your job search through our intuitive job seeker dashboard.',
      keywords:
        'job seeker dashboard, application tracking, job search management, career tools',
    },
  },
  {
    path: 'job-list',
    component: JobListComponent,
    data: {
      title: 'Browse Jobs | Find Your Next Opportunity | HiYrNow',
      description:
        'Explore thousands of job opportunities across various industries and locations. Find your perfect career match.',
      keywords: 'job listings, browse jobs, career opportunities, job search',
    },
  },

  {
    path: 'job-list/:location/:keyword/view-job/:jobId',
    component: ViewJobComponent,
    data: {
      title: 'Job Details - hiyrnow',
      description: 'View job details on hiyrnow.',
      keywords: 'job details, job listing, hiyrnow',
    },
  },
  {
    path: 'dashboard-seeker/view-job/:jobId',
    component: ViewJobComponent,
    data: {
      title: 'Job Details - hiyrnow',
      description: 'View job details on hiyrnow.',
      keywords: 'job details, job listing, hiyrnow',
    },
  },
  {
    path: 'company/dashboard/view-job/:jobId',
    component: ViewJobComponent,
    data: {
      title: 'Job Details - hiyrnow',
      description: 'View job details on hiyrnow.',
      keywords: 'job details, job listing, hiyrnow',
    },
  },
  {
    path: 'new-job',
    component: PostJobComponent,
    data: {
      title: 'Post a Job - hiyrnow',
      description: 'Post a new job on hiyrnow.',
      keywords: 'post job, new job, hiyrnow',
    },
  },
  {
    path: 'applied-jobs',
    component: AppliedJobsListComponent,
    data: {
      title: 'Applied Jobs - hiyrnow',
      description: 'View the jobs you have applied for on hiyrnow.',
      keywords: 'applied jobs, job applications, hiyrnow',
    },
  },
  {
    path: 'profile-seeker/:userId',
    component: UserProfileShareComponent,
    data: {
      title: 'Job Seeker Profile - hiyrnow',
      description: 'View the shared job seeker profile on hiyrnow.',
      keywords: 'job seeker profile, shared profile, hiyrnow',
    },
  },
  {
    path: 'profile-seeker/:jobId/:userId',
    component: UserProfileShareComponent,
    data: {
      title: 'Job Seeker Profile - hiyrnow',
      description: 'View the shared job seeker profile on hiyrnow.',
      keywords: 'job seeker profile, shared profile, hiyrnow',
    },
  },
  {
    path: 'jobApplication/:jobId/:userId',
    component: JobApplicationComponent,
    data: {
      title: 'jobApplication - hiyrnow',
      description: 'View the shared jobApplication on hiyrnow.',
      keywords: 'job seeker profile, shared profile, hiyrnow',
    },
  },
  {
    path: 'privacy',
    component: PrivacyPolicyComponent,
    data: {
      title: 'Privacy Policy | Data Protection | HiYrNow',
      description:
        'Learn how we protect your personal information and ensure your data security on our platform.',
      keywords: 'privacy policy, data protection, security, user privacy',
    },
  },
  {
    path: 'terms',
    component: TermsConditionsComponent,
    data: {
      title: 'Terms & Conditions | HiYrNow',
      description:
        'Review our terms of service and understand your rights and responsibilities when using our platform.',
      keywords:
        'terms and conditions, user agreement, platform rules, service terms',
    },
  },
  {
    path: 'cookies',
    component: CookiesPolicyComponent,
    data: {
      title: 'Cookie Policy | HiYrNow',
      description:
        'Understand how we use cookies to enhance your experience and improve our services.',
      keywords:
        'cookie policy, data collection, website cookies, privacy settings',
    },
  },
  {
    path: 'contact',
    component: ContactComponent,
    data: {
      title: 'Contact Us | Support & Inquiries | HiYrNow',
      description:
        'Get in touch with our support team for assistance with your job search or recruitment needs.',
      keywords:
        'contact support, help center, customer service, platform assistance',
    },
  },
  {
  path: 'auth/google/success',
  component: LoginComponent
},
  {
    path: '**',
    component: SummitLandingComponent,
    data: {
      title: 'Page Not Found | HiYrNow',
      description:
        'The page you are looking for could not be found. Return to our homepage to continue your job search.',
      keywords: '404, page not found, error page, job search',
    },
  },
  // { path: 'sitemap.xml', component: SitemapComponent },
];

export const routing = RouterModule.forRoot(appRoutes, {
  initialNavigation: 'enabledBlocking',
  scrollPositionRestoration: 'enabled',
});
