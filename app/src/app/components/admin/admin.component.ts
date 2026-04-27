import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UserService } from '../../services/user.service';
// import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/user.model.client';
import { environment } from '../../../environments/environment';
interface PendingUser {
  _id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  companyName?: string;
  contactNumber?: string;
  premiumRequestStatus?: string;
  createdAt: Date;
}
// Credits Management Interface
interface CreditTransaction {
  _id?: string;
  username: string;
  email: string;
  creditAmount: number;
  transactionType: 'ADD' | 'REMOVE';
  createdAt: Date;
  adminUsername: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  // User Management
  pendingRecruiters: PendingUser[] = [];
  pendingPremiumJobSeekers: PendingUser[] = [];
  systemStats = {
    totalUsers: 0,
    totalRecruiters: 0,
    totalPremiumUsers: 0,
    pendingApprovals: 0,
  };

  // Admin Creation Form
  @ViewChild('adminForm') adminForm!: NgForm;
  newAdmin = {
    username: '',
    password: '',
    email: '',
    role: 'Admin',
  };

  // Modal and Detail Controls
  selectedUser: PendingUser | null = null;
  showUserDetailsModal = false;

  // Search and Filter
  searchTerm = '';
  filterRole: string = 'Recruiters';
  sortField: keyof PendingUser = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;

  constructor(
    private userService: UserService // private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  // Comprehensive Data Loading
  async loadDashboardData(): Promise<void> {
    try {
      // Fetch pending recruiters and job seekers
      this.pendingRecruiters = await this.userService.findPendingRecruiters();
      const allUsers = await this.userService.findAllUsers();

      this.pendingPremiumJobSeekers = allUsers.filter(
        (user: PendingUser) =>
          user.role === 'JobSeeker' && user.premiumRequestStatus === 'Pending'
      );

      // Calculate system-wide statistics
      this.systemStats = {
        totalUsers: allUsers.length,
        totalRecruiters: allUsers.filter((u: User) => u.role === 'Recruiter')
          .length,
        totalPremiumUsers: allUsers.filter(
          (u: User) => u.premiumRequestStatus === 'Approved'
        ).length,
        pendingApprovals: this.pendingRecruiters.length,
      };
    } catch (error) {
      //this.notificationService.showError('Failed to load dashboard data');
      console.error('Dashboard load error:', error);
    }
  }

  // User Approval Methods
  async approveRecruiter(user: PendingUser): Promise<void> {
    try {
      await this.userService.approveRecruiter(user._id);
      this.pendingRecruiters = this.pendingRecruiters.filter(
        (r) => r._id !== user._id
      );
      //this.notificationService.showSuccess(`Recruiter ${user.username} approved successfully`);
      this.loadDashboardData(); // Refresh stats
    } catch (error) {
      //this.notificationService.showError('Failed to approve recruiter');
    }
  }

  async rejectRecruiter(user: PendingUser): Promise<void> {
    try {
      await this.userService.rejectRecruiter(user._id);
      this.pendingRecruiters = this.pendingRecruiters.filter(
        (r) => r._id !== user._id
      );
      //this.notificationService.showSuccess(`Recruiter ${user.username} rejected`);
      this.loadDashboardData(); // Refresh stats
    } catch (error) {
      //this.notificationService.showError('Failed to reject recruiter');
    }
  }

  async grantPremiumAccess(user: PendingUser): Promise<void> {
    try {
      await this.userService.grantPremiumAccess(user._id);
      this.pendingPremiumJobSeekers = this.pendingPremiumJobSeekers.filter(
        (js) => js._id !== user._id
      );
      //this.notificationService.showSuccess(`Premium access granted to ${user.username}`);
      this.loadDashboardData(); // Refresh stats
    } catch (error) {
      //this.notificationService.showError('Failed to grant premium access');
    }
  }

  // Admin User Management
  async createAdmin(): Promise<void> {
    if (this.adminForm.invalid) {
      //this.notificationService.showError('Please fill all required fields');
      return;
    }

    try {
      const result = await this.userService.createUser(this.newAdmin);

      if (result.status === true) {
        //this.notificationService.showSuccess('Admin user created successfully');
        this.resetAdminForm();
      } else {
        //this.notificationService.showError('Username already exists');
      }
    } catch (error) {
      //this.notificationService.showError('Failed to create admin user');
    }
  }

  // User Details Modal
  showUserDetails(user: PendingUser): void {
    this.selectedUser = user;
    this.showUserDetailsModal = true;
  }

  // Utility Methods
  resetAdminForm(): void {
    this.adminForm.resetForm();
  }

  // Advanced Filtering and Sorting
  filterUsers(): PendingUser[] {
    let filteredUsers = [
      ...this.pendingRecruiters,
      ...this.pendingPremiumJobSeekers,
    ];

    // Text Search
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(searchTermLower) ||
          (user.email && user.email.toLowerCase().includes(searchTermLower)) ||
          (user.firstName &&
            user.firstName.toLowerCase().includes(searchTermLower)) ||
          (user.lastName &&
            user.lastName.toLowerCase().includes(searchTermLower))
      );
    }

    // Role Filtering
    if (this.filterRole) {
      filteredUsers = filteredUsers.filter(
        (user) => user.role === this.filterRole
      );
    }

    // Sorting
    return filteredUsers.sort((a, b) => {
      const valueA = a[this.sortField] ?? '';
      const valueB = b[this.sortField] ?? '';

      if (valueA === valueB) return 0;

      const comparison = valueA > valueB ? 1 : -1;
      return this.sortDirection === 'desc' ? comparison * -1 : comparison;
    });
  }
}
