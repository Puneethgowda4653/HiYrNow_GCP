import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Observable, catchError, throwError, retry, timeout } from 'rxjs';
import { User } from '../models/user.model.client';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

export interface CreditTransaction {
  type: string;
  amount: number;
  timestamp: Date;
  previousBalance: number;
  newBalance: number;
  adminId: string;
}

export interface CreditManagementResponse {
  success: boolean;
  message: string;
  newBalance?: number;
  transaction?: CreditTransaction;
  error?: string;
}

export interface IntegrationResponse {
  success: boolean;
  message: string;
  authUrl?: string;
  profile?: any;
  state?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private base: string;
  url: string;
  urlRegister: string;
  urlLoggedUser: string;
  urlLoggedRecruiter: string;
  urlUpdateProfile: string;
  urlLogin: string;
  urlPassReset: string;
  urlVerifyUsername: string;
  urlLogout: string;
  urlDeleteProfile: string;
  urlApproveRecruiter: string;
  urlPending: string;
  urlRecruiterProfile: string;
  urlPremiumGrant: string;
  urlPremiumRevoke: string;
  urlProfilePic: string;
  urlUserProfile: string;
  profileDetails: string;
  matchingjob: string;
  userResume: string;
  downloadresume: string;
  profileScore: string;
  dashboard: string;
  credits: string;
  restpassword: string;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Determine base URL based on platform and environment
    // if (isPlatformBrowser(this.platformId)) {
    //   this.base = !location.toString().includes('localhost')
    //   ? 'https://hiyrnow-backend-786443796056.europe-west1.run.app'
    //   : 'https://hiyrnow-backend-786443796056.europe-west1.run.app';
    // } else {
    //   // Server-side default URL
    //   this.base = environment.apiUrl;
    // }

    if (isPlatformBrowser(this.platformId)) {
      this.base = !location.toString().includes('localhost')
        ? environment.apiUrl
        : '';
    } else {
      this.base = environment.apiUrl;
    }

    // Initialize all URLs using the base
    this.restpassword = this.base + '/api';
    this.urlProfilePic = this.base;
    this.url = this.base + '/api/user';
    this.urlRegister = this.base + '/api/register';
    this.urlLoggedUser = this.base + '/api/profile';
    this.urlLoggedRecruiter = this.base + '/api/profile/recruiter';
    this.urlUpdateProfile = this.base + '/api/profile';
    this.urlLogin = this.base + '/api/login';
    this.urlPassReset = this.base + '/api/reset';
    this.urlVerifyUsername = this.base + '/api/verify';
    this.urlLogout = this.base + '/api/logout';
    this.urlDeleteProfile = this.base + '/api/user';
    this.urlApproveRecruiter = this.base + '/api/approve';
    this.urlPending = this.base + '/api/pending';
    this.urlRecruiterProfile = this.base + '/api/profile/recruiter';
    this.urlPremiumGrant = this.base + '/api/premium/approve';
    this.urlPremiumRevoke = this.base + '/api/premium/revoke';
    this.urlUserProfile = this.base + '/api/user/user-profile';
    this.profileDetails = this.base + '/api/user/details';
    this.matchingjob = this.base + '/api/match-jobs';
    this.userResume = this.base + '/api/user/reusme';
    this.downloadresume = this.base + '/api/file';
    this.profileScore = this.base + '/api/profile/score';
    this.dashboard = this.base + '/api/dashboard';
    this.credits = this.base + '/api';
  }

  summitSignup(data: any) {
    const url = `${this.base}/api/summit/signup`;
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
    }).then(async (response) => {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (!response.ok) {
          const error: any = new Error(
            result.message || result.error || 'Summit signup failed'
          );
          error.status = response.status;
          error.error = result;
          throw error;
        }
        return result;
      } else {
        if (!response.ok) {
          const error: any = new Error(
            `HTTP error! status: ${response.status}`
          );
          error.status = response.status;
          throw error;
        }
        return null;
      }
    });
  }

  findUserByUsername(username: string): Observable<any> {
    return this.http.get(`${this.credits}/users/${username}`);
  }

  googleLogin(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = `${this.urlProfilePic}/api/auth/google`;
    }
  }

  // Add credits by admin
  addCredits(
    userId: string,
    amount: number
  ): Observable<CreditManagementResponse> {
    console.log('userrrrid', userId);
    return this.http.post<CreditManagementResponse>(
      `${this.credits}/admin/credits/add`,
      { userId, amount },
      { withCredentials: true } // Ensures cookies and credentials are sent
    );
  }

  // Remove credits by admin
  removeCredits(
    userId: string,
    amount: number
  ): Observable<CreditManagementResponse> {
    return this.http.post<CreditManagementResponse>(
      `${this.credits}/admin/credits/remove`,
      {
        userId,
        amount,
      }
    );
  }

  // Get user's credit balance
  getUserCreditBalance(userId: string): Observable<{ points: number }> {
    return this.http.get<{ points: number }>(
      `${this.credits}/credits/balance?userId=${userId}`
    );
  }

  // Get user's credit transactions
  getUserCreditTransactions(
    userId: string
  ): Observable<{ transactions: CreditTransaction[] }> {
    return this.http.get<{ transactions: CreditTransaction[] }>(
      `${this.credits}/credits/transactions?userId=${userId}`
    );
  }

  // getCurrentUser(): Observable<any> {
  //   return this.http.get(`${this.urlProfilePic}/api/current_user`);
  // }
  getCurrentUser(): Observable<any> {
    return this.http
      .get(`${this.urlProfilePic}/api/current_user`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }
  getAllDashboardData(userId: string): Observable<any> {
    return this.http
      .get(`${this.dashboard}/${userId}/all`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  updateIntegrationStatus(
    userId: string,
    type: string,
    status: boolean
  ): Observable<any> {
    return this.http
      .put(
        `${this.dashboard}/${userId}/integration/${type}`,
        { status },
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  // Add new method for manual dashboard updates if needed
  updateDashboardData(userId: string, dashboardData: any): Observable<any> {
    return this.http
      .put(`${this.dashboard}/${userId}`, dashboardData, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  downloadPDF(filename: string, userId: string): Observable<Blob> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http
      .get(`${this.downloadresume}/${filename}/${userId}`, {
        responseType: 'blob',
        headers: headers,
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, body was: ${error.error}`
      );
    }
    return throwError('Something bad happened; please try again later.');
  }

  getUserDetails(userId: string, feature?: string): Observable<any> {
    let params = new HttpParams();
    if (feature) {
      params = params.set('feature', feature);
    }

    // Combine params and withCredentials into a single options object
    const options = {
      params,
      withCredentials: true,
    };

    return this.http.get<User>(`${this.profileDetails}/${userId}`, options);
  }

  getUserResume(userId: string): Observable<any> {
    return this.http.get<User>(`${this.userResume}/${userId}`);
  }

  getMatchedJobs(userId: string): Observable<any> {
    return this.http.get(`${this.matchingjob}/${userId}`);
  }

  getProfileCompletionScore(userId: string): Observable<{
    sectionsCompleted: number;
    totalSections: number;
    remainingSections: never[];
    score: number;
  }> {
    return this.http.get<{
      sectionsCompleted: number;
      totalSections: number;
      remainingSections: never[];
      score: number;
    }>(`${this.profileScore}/${userId}`);
  }

  getUserProfileById(userId: string): Observable<any> {
    return this.http.get(`${this.urlUserProfile}/${userId}`);
  }

  register(user: any) {
    return fetch(this.urlRegister, {
      method: 'POST',
      body: JSON.stringify(user),
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
    }).then(async (response) => {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          // If response is not ok, throw error with the response data
          const error: any = new Error(data.message || data.error || 'Registration failed');
          error.status = response.status;
          error.error = data;
          throw error;
        }
        return data;
      } else {
        if (!response.ok) {
          const error: any = new Error(`HTTP error! status: ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return null;
      }
    });
  }

  login(identifier: string, password: string) {
    return fetch(this.urlLogin, {
      method: 'POST',
      body: JSON.stringify({ username: identifier, password: password }),
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  logout() {
    return fetch(this.urlLogout, {
      method: 'POST',
      credentials: 'include',
    });
  }

  findLoggedUser() {
    return fetch(this.urlLoggedUser, {
      credentials: 'include',
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  findLoggedRecruiter() {
    return fetch(this.urlLoggedRecruiter, {
      credentials: 'include',
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  updateUserProfile(user: {
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    socialContact?:
    | { socialtype: string; url: string }[]
    | { socialtype: string; url: string }[];
    premiumRequestStatus?: string;
    tagline?: string;
    openToJobs?: boolean;
    currentLocation?: string;
    preferredLocation?: string;
    preferredJobType?: string;
    minSalary?: number;
    maxSalary?: number;
    industry?: string;
    [key: string]: any; // Allow additional fields
  }) {
    return fetch(this.urlUpdateProfile, {
      method: 'PUT',
      body: JSON.stringify(user),
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    });
  }

  deleteUser(userId: string) {
    return fetch(this.url + '/' + userId, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  uploadProfilePic(formData: FormData): Observable<any> {
    // Log FormData contents before sending

    return this.http.post(
      `${this.urlProfilePic}/upload-profile-pic`,
      formData,
      {
        withCredentials: true,
      }
    );
  }

  uploadCoverPhoto(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.urlProfilePic}/api/upload-cover-photo`,
      formData,
      { withCredentials: true }
    );
  }

  getProfilePic(userId: string): Observable<Blob> {
    return this.http.get(`${this.urlProfilePic}/profile-pic/${userId}`, {
      responseType: 'blob',
    });
  }

  createUser(user: { username: any; password: any; role: string }) {
    return fetch(this.url, {
      method: 'POST',
      body: JSON.stringify(user),
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  approveRecruiter(userId: string) {
    return fetch(this.urlApproveRecruiter + '/' + userId, {
      method: 'POST',
      credentials: 'include',
    });
  }

  rejectRecruiter(userId: string) {
    return fetch(this.url + '/' + userId, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  grantPremiumAccess(userId: string) {
    return fetch(this.urlPremiumGrant + '/' + userId, {
      method: 'POST',
      credentials: 'include',
    });
  }

  imageUrlUpload(userId: string, imageUrl: string) {
    return fetch(imageUrl + '/' + userId, {
      method: 'POST',
      credentials: 'include',
    });
  }

  revokePremiumAccess(userId: string) {
    return fetch(this.urlPremiumRevoke + '/' + userId, {
      method: 'POST',
      credentials: 'include',
    });
  }

  getUserProfile(userId: string): Observable<User> {
    return this.http.get<User>(`${this.urlUserProfile}/${userId}`);
  }

  findPendingRecruiters() {
    return fetch(this.urlPending, {
      credentials: 'include',
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  addRecruiterProfile(recruiter: any) {
    return fetch(this.urlRecruiterProfile, {
      method: 'POST',
      body: JSON.stringify(recruiter),
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  findAllUsers() {
    return fetch(this.url, {
      credentials: 'include',
    }).then((response) => {
      if (response.headers.get('content-type') != null) {
        return response.json();
      } else {
        return null;
      }
    });
  }

  importLinkedInProfile() {
    // Endpoint that triggers LinkedIn OAuth and profile data import
    return this.http.get('/api/user/import-linkedin-profile').toPromise();
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.restpassword}/request-password-reset`, {
      email,
    });
  }

  resetPassword(data: { token: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.restpassword}/reset-password`, data);
  }

  initiateLinkedInAuth(): Observable<IntegrationResponse> {
    return this.http
      .get<IntegrationResponse>(
        `${this.base}/api/dashboard/integration/linkedin/auth`,
        {
          withCredentials: true,
          headers: new HttpHeaders({
            Accept: 'application/json',
          }),
        }
      )
      .pipe(
        retry(2),
        timeout(15000),
        catchError((error) => {
          console.error('LinkedIn auth initialization failed:', error);
          return throwError(
            () =>
              new Error(
                error.status === 0
                  ? 'Network error. Please check your connection.'
                  : error.status === 504
                    ? 'Service timeout. Please try again.'
                    : 'Unable to connect to LinkedIn. Please try again.'
              )
          );
        })
      );
  }

  handleLinkedInCallback(
    code: string,
    state: string
  ): Observable<IntegrationResponse> {
    return this.http
      .post<IntegrationResponse>(
        `${this.base}/api/dashboard/integration/linkedin/callback`,
        { code, state },
        {
          withCredentials: true,
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
          }),
        }
      )
      .pipe(
        retry(1),
        timeout(20000),
        catchError((error) => {
          console.error('LinkedIn callback processing failed:', error);
          return throwError(
            () =>
              new Error(
                error.name === 'TimeoutError'
                  ? 'LinkedIn service timeout. Please try again.'
                  : 'Failed to complete LinkedIn integration. Please try again.'
              )
          );
        })
      );
  }

  // Calendar Integration
  connectCalendar(
    calendarType: 'google' | 'outlook',
    authCode: string
  ): Observable<IntegrationResponse> {
    return this.http
      .post<IntegrationResponse>(
        `${this.base}/api/dashboard/integration/calendar`,
        { calendarType, authCode },
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  // Video Conference Integration
  connectVideoConference(
    zoomAuthCode: string
  ): Observable<IntegrationResponse> {
    return this.http
      .post<IntegrationResponse>(
        `${this.base}/api/dashboard/integration/video-conference/zoom`,
        { zoomAuthCode },
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  // Document Verification
  uploadDocuments(files: File[]): Observable<IntegrationResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    return this.http
      .post<IntegrationResponse>(
        `${this.base}/api/dashboard/integration/documents`,
        formData,
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  verifyOTP(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.base}/api/verify-otp`, { email, otp });
  }

  sendOTP(email: string): Observable<any> {
    return this.http.post(`${this.base}/api/send-otp`, { email }, { withCredentials: true });
  }

  verifyCompanyEmailOTP(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.base}/api/verify-company-email-otp`, { email, otp }, { withCredentials: true });
  }

  resendOTP(email: string): Observable<any> {
    return this.http.post(`${this.base}/api/resend-otp`, { email });
  }

  // ========================================================================
  // NEW ENHANCED DASHBOARD ENDPOINTS
  // ========================================================================

  /**
   * Get AI-powered job recommendations
   * @param userId - User ID
   * @param filter - Filter type: skills | location | resume | trending | similar
   * @param limit - Number of results
   * @param page - Page number
   */
  getJobRecommendations(
    userId: string,
    filter: string = 'skills',
    limit: number = 10,
    page: number = 1
  ): Observable<any> {
    const params = new HttpParams()
      .set('filter', filter)
      .set('limit', limit.toString())
      .set('page', page.toString());

    return this.http
      .get(`${this.dashboard}/${userId}/recommendations`, {
        params,
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get user's saved jobs
   */
  getSavedJobs(userId: string): Observable<any> {
    return this.http
      .get(`${this.dashboard}/${userId}/saved-jobs`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Save a job
   */
  saveJob(userId: string, jobId: string): Observable<any> {
    return this.http
      .post(
        `${this.dashboard}/${userId}/saved-jobs/${jobId}`,
        {},
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Remove saved job
   */
  removeSavedJob(userId: string, jobId: string): Observable<any> {
    return this.http
      .delete(`${this.dashboard}/${userId}/saved-jobs/${jobId}`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get user notifications
   */
  getNotifications(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 20
  ): Observable<any> {
    const params = new HttpParams()
      .set('unreadOnly', unreadOnly.toString())
      .set('limit', limit.toString());

    return this.http
      .get(`${this.dashboard}/${userId}/notifications`, {
        params,
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(
    userId: string,
    notificationId: string
  ): Observable<any> {
    return this.http
      .put(
        `${this.dashboard}/${userId}/notifications/${notificationId}/read`,
        {},
        { withCredentials: true }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Get profile completion status
   */
  getProfileCompletion(userId: string): Observable<any> {
    return this.http
      .get(`${this.dashboard}/${userId}/profile-completion`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get user skills overview
   */
  getSkillsOverview(userId: string): Observable<any> {
    return this.http
      .get(`${this.dashboard}/${userId}/skills`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get career milestones
   */
  getCareerMilestones(userId: string): Observable<any> {
    return this.http
      .get(`${this.dashboard}/${userId}/milestones`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get salary insights
   */
  getSalaryInsights(userId: string): Observable<any> {
    return this.http
      .get(`${this.dashboard}/${userId}/salary-insights`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get achievement badges
   */
  getBadges(userId: string): Observable<any> {
    return this.http
      .get(`${this.dashboard}/${userId}/badges`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get recommended learning resources
   */
  getLearningResources(userId: string): Observable<any> {
    return this.http
      .get(`${this.dashboard}/${userId}/learning`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get recent activities
   */
  getRecentActivities(userId: string, limit: number = 10): Observable<any> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http
      .get(`${this.dashboard}/${userId}/activities`, {
        params,
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get AI career insights
   */
  getAIInsights(userId: string): Observable<any> {
    return this.http
      .get(`${this.dashboard}/${userId}/ai-insights`, {
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }
}
