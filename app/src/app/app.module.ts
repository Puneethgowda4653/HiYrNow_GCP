import { BrowserModule, Meta, Title } from '@angular/platform-browser';
import { NgModule, isDevMode } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { ServiceWorkerModule } from '@angular/service-worker';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { CredentialsInterceptor } from './interceptors/credentials.interceptor';
import {
  faCalendar,
  faBriefcase,
  faUsers,
  faChartLine,
} from '@fortawesome/free-solid-svg-icons';
import { HttpClientModule } from '@angular/common/http';
import { QuillModule } from 'ngx-quill';
import { NgxFileDropModule } from 'ngx-file-drop';
import { routing } from './app.routing';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { ProfileRecruiterComponent } from './components/profile-recruiter/profile-recruiter.component';
import { ProfileSeekerComponent } from './components/profile-seeker/profile-seeker.component';
import { NavBarComponent } from './components/nav-bar/nav-bar.component';
import { JobBoardComponent } from './components/job-board/job-board.component';
import { FooterComponent } from './components/footer/footer.component';
// import { SearchFilterPipe } from './components/job-board/job-board.component';
import { ViewJobComponent } from './components/view-job/view-job.component';
import { JobListingService } from './services/job-listing.service';
import { UserService } from './services/user.service';
import { RegisterComponent } from './components/register/register.component';
import { AdminComponent } from './components/admin/admin.component';
import { PostJobComponent } from './components/post-job/post-job.component';
import { SaveJobService } from './services/save-job.service';
import { ExperienceListComponent } from './components/experience-list/experience-list.component';
import { AwardListComponent } from './components/award-list/award-list.component';
import { SkillListComponent } from './components/skill-list/skill-list.component';
import { EducationListComponent } from './components/education-list/education-list.component';
import { ExtraCurricularListComponent } from './components/extra-curricular-list/extra-curricular-list.component';
import { ProjectListComponent } from './components/project-list/project-list.component';
import { CertificateListComponent } from './components/certificate-list/certificate-list.component';
import { PersonalInfoComponent } from './components/personal-info/personal-info.component';
import { UserSidebarComponent } from './components/user-sidebar/user-sidebar.component';
import { JobSeekerDashboardComponent } from './components/job-seeker-dashboard/job-seeker-dashboard.component';
import { RecruiterDashboardComponent } from './components/recruiter-dashboard/recruiter-dashboard.component';
import { ResumeUploadComponent } from './components/resume-upload/resume-upload/resume-upload.component';
import { ResumeViewComponent } from './components/resume-view/resume-view.component';
import { MatDialogModule } from '@angular/material/dialog';
import { JobListComponent } from './components/job-list/job-list.component';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
// import { FileUploadModule } from 'ng2-file-upload';
import { MatTableModule } from '@angular/material/table';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { ProfilePicComponent } from './components/profile-pic/profile-pic.component';
import { EditBioModalComponent } from './components/edit-bio-modal/edit-bio-modal.component';
import { UserProfileShareComponent } from './components/user-profile-share/user-profile-share.component';
import { AboutComponent } from './components/about/about.component';
import { AskComponent } from './components/ask/ask.component';
import { PricingComponent } from './components/pricing/pricing.component';
import { SubscribeModalComponent } from './components/subscribe-modal/subscribe-modal.component';
import { PVCListComponent } from './components/pvc-list/pvc-list.component';
import { CommonModule } from '@angular/common';
import { JobPostingService } from './services/job-posting.service';
import { RecruiterDetailService } from './services/recruiter-detail.service';
import { AppliedJobsListComponent } from './components/applied-jobs-list/applied-jobs-list.component';
import { SitemapComponent } from './components/sitemap/sitemap.component';
import { SafeHtmlPipe } from './pipe/safe-html.pipe';
import { EmployerRegisterComponent } from './components/employer-register/employer-register.component';
import { EditJobPostingComponent } from './components/edit-job-posting/edit-job-posting.component';
// Import Angular Material modules

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatChipsModule } from '@angular/material/chips';
import { JobApplicationComponent } from './components/job-application/job-application.component';
import { ScheduleInterviewModalComponent } from './components/schedule-interview-modal/schedule-interview-modal.component';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { JobApplicationModalComponent } from './components/job-application-modal/job-application-modal.component';
import { EditProfileModalComponent } from './components/edit-profile-modal/edit-profile-modal.component';
import { MatchedProfileViewComponent } from './components/matched-profile-view/matched-profile-view.component';
import { EmailService } from './services/email-service.service';
import { AssignmentModalComponent } from './components/assignment-modal/assignment-modal.component';
import { CompanayJobListComponent } from './components/companay-job-list/companay-job-list.component';
import { SidebarNavItemComponent } from './components/sidebar-nav-item/sidebar-nav-item.component';
// import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreditPointsComponent } from './components/credit-points/credit-points.component';
import { PurchasePointsComponent } from './components/purchase-points/purchase-points.component';
import { SettingsComponent } from './components/settings/settings.component';
import { AdminCreditManagementComponent } from './components/admin-credit-management/admin-credit-management.component';
import { UsersListComponent } from './components/users-list/users-list.component';
import { CompanyPublicProfileComponent } from './components/company-public-profile/company-public-profile.component';
import { LayoutModule } from '@angular/cdk/layout';
import { PasswordResetComponent } from './components/password-reset/password-reset.component';
import { BlogComponent } from './components/blog/blog.component';
import { AdminBlogComponent } from './components/admin-blog/admin-blog.component';
import { BlogDetailComponent } from './components/blog-detail/blog-detail.component';
import { JobApplicationDetailsComponent } from './components/job-application-details/job-application-details.component';
import { ShareModalComponent } from './components/share-modal/share-modal.component';
import { SeoService } from './services/seo.service';
import { SignupComponent } from './components/signup/signup.component';
import { CommingsoonComponent } from './components/commingsoon/commingsoon.component';
import { ContactDialogComponent } from './components/contact-dialog/contact-dialog.component';
import { ProfileListComponent } from './components/profile-list/profile-list.component';
import { ManageJobComponent } from './components/manage-job/manage-job.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CompanyProfileComponent } from './components/company-profile/company-profile.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { FaqSectionComponent } from './components/faq-section/faq-section.component';
import { DemoFormComponent } from './components/demo-form/demo-form.component';
// Import new components
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { TermsConditionsComponent } from './components/terms-conditions/terms-conditions.component';
import { CookiesPolicyComponent } from './components/cookies-policy/cookies-policy.component';
import { ContactComponent } from './components/contact/contact.component';
import { AIAnalysisModalComponent } from './components/ai-analysis-modal/ai-analysis-modal.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { ProfilePreviewCardComponent } from './components/profile-preview-card/profile-preview-card.component';
import { UiModule } from './ui/ui.module';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { AdminJobsComponent } from './components/admin-jobs/admin-jobs.component';
import { AdminPlansComponent } from './components/admin-plans/admin-plans.component';
import { AdminAnalyticsComponent } from './components/admin-analytics/admin-analytics.component';
import { AdminSettingsComponent } from './components/admin-settings/admin-settings.component';
import { AppliedUsersListComponent } from './components/skill-list/applied-users-list/applied-users-list.component';
import { MatchedUsersListComponent } from './components/skill-list/matched-users-list/matched-users-list.component';
import { PvcUsersListComponent } from './components/skill-list/pvc-users-list/pvc-users-list.component';
import { CompanyDashboardComponent } from './components/company-dashboard/company-dashboard.component';
import { AIJobGeneratorComponent } from './components/ai-job-generator/ai-job-generator.component';
import { PlanUsageComponent } from './components/plan-usage/plan-usage.component';
import { PaymentSuccessComponent } from './components/payment-success/payment-success.component';
import { PaymentFailedComponent } from './components/payment-failed/payment-failed.component';
// Import new recruiter flow components
import { NotificationModalComponent } from './components/notification-modal/notification-modal.component';
import { RecruiterNotificationService } from './services/recruiter-notification.service';
import { ProfileSummaryComponent } from './components/profile-summary/profile-summary.component';
import { ProfileStepperComponent } from './components/profile-stepper/profile-stepper.component';
import { PwaInstallPromptComponent } from './components/pwa-install-prompt/pwa-install-prompt.component';
import { OfflinePageComponent } from './components/offline-page/offline-page.component';
import { PwaService } from './services/pwa.service';
import { OfflineQueueService } from './services/offline-queue.service';
import { CandidateProfileViewComponent } from './components/candidate-profile-view/candidate-profile-view.component';
import { RoleSelectorComponent } from './components/role-selector/role-selector.component';
import { AuthOptionsComponent } from './components/auth-options/auth-options.component';
import { JobseekerRegisterComponent } from './components/jobseeker-register/jobseeker-register.component';
import { RecruiterRegisterComponent } from './components/recruiter-register/recruiter-register.component';
import { SummitSignupComponent } from './components/summit-signup/summit-signup.component';
import { SummitLandingComponent } from './summit-landing/summit-landing.component';
import { SummitWelcomeComponent } from './summit-landing/summit-welcome.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RoleSelectorComponent,
    AuthOptionsComponent,
    JobseekerRegisterComponent,
    RecruiterRegisterComponent,
    ProfileRecruiterComponent,
    ProfileSeekerComponent,
    NavBarComponent,
    JobBoardComponent,
    FooterComponent,

    ViewJobComponent,
    JobListComponent,
    RegisterComponent,
    AdminComponent,
    PostJobComponent,
    ExperienceListComponent,
    AwardListComponent,
    SkillListComponent,
    EducationListComponent,
    ExtraCurricularListComponent,
    ProjectListComponent,
    CertificateListComponent,
    PersonalInfoComponent,
    UserSidebarComponent,
    JobSeekerDashboardComponent,
    RecruiterDashboardComponent,
    ResumeUploadComponent,
    ResumeViewComponent,
    ProfilePicComponent,
    EditBioModalComponent,
    UserProfileShareComponent,
    AboutComponent,
    AskComponent,
    PricingComponent,
    PVCListComponent,
    AppliedJobsListComponent,
    SitemapComponent,
    SafeHtmlPipe,
    EmployerRegisterComponent,
    EditJobPostingComponent,
    JobApplicationComponent,
    ScheduleInterviewModalComponent,
    JobApplicationModalComponent,
    EditProfileModalComponent,
    MatchedProfileViewComponent,
    AssignmentModalComponent,
    CompanayJobListComponent,
    SidebarNavItemComponent,
    CreditPointsComponent,
    PurchasePointsComponent,
    SettingsComponent,
    AdminCreditManagementComponent,
    UsersListComponent,
    CompanyPublicProfileComponent,
    PasswordResetComponent,
    AdminBlogComponent,
    BlogComponent,
    BlogDetailComponent,
    JobApplicationDetailsComponent,
    ShareModalComponent,
    SignupComponent,
    CommingsoonComponent,
    ContactDialogComponent,
    ProfileListComponent,
    ManageJobComponent,
    CompanyProfileComponent,
    UserProfileComponent,
    FaqSectionComponent,
    DemoFormComponent,
    PrivacyPolicyComponent,
    TermsConditionsComponent,
    ContactComponent,
    CookiesPolicyComponent,
    AIAnalysisModalComponent,
    OnboardingComponent,
    ProfilePreviewCardComponent,
    AdminDashboardComponent,
    AdminUsersComponent,
    AdminJobsComponent,
    AdminPlansComponent,
    AdminAnalyticsComponent,
    AdminSettingsComponent,
    AppliedUsersListComponent,
    PvcUsersListComponent,
    MatchedUsersListComponent,
    CompanyDashboardComponent,
    AIJobGeneratorComponent,
    SubscribeModalComponent,
    PlanUsageComponent,
    PaymentSuccessComponent,
    PaymentFailedComponent,
    NotificationModalComponent,
    ProfileSummaryComponent,
    ProfileStepperComponent,
    PwaInstallPromptComponent,
    OfflinePageComponent,
    CandidateProfileViewComponent,
    SummitSignupComponent,
    SummitLandingComponent,
    SummitWelcomeComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    routing,
    UiModule,
    // FileUploadModule,
    FontAwesomeModule,
    MatIconModule,
    MatInputModule,
    LayoutModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatProgressBarModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    MatIconModule,
    MatListModule,
    NgxFileDropModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatTableModule,
    HttpClientModule,
    MatDialogModule,
    FontAwesomeModule,
    ButtonsModule.forRoot(),
    BsDropdownModule.forRoot(),
    ToastrModule.forRoot({
      timeOut: 4000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true,
      closeButton: true,
      newestOnTop: true,
    }),
    QuillModule.forRoot(),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    // Add new standalone components
  ],
  providers: [
    JobListingService,
    UserService,
    SaveJobService,
    JobPostingService,
    RecruiterDetailService,
    RecruiterNotificationService,
    ToastrService,
    EmailService,
    Meta,
    SeoService,
    Title,
    PwaService,
    OfflineQueueService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CredentialsInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    library.addIcons(faBriefcase, faUsers, faCalendar, faChartLine); // <-- ADD ICONS HERE
  }
}
