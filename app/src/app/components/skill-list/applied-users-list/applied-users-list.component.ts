import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-applied-users-list',

  templateUrl: './applied-users-list.component.html',
  styleUrl: './applied-users-list.component.css',
})
export class AppliedUsersListComponent {
  @Input() candidates: any[] = [];
  @Input() jobId!: string;
  @Input() getUserProfilePicUrl!: (application: any) => string;
  @Input() setDefaultProfilePic!: (application: any) => void;
  // @Input() getStatusColor!: (status: string) => string;
  showAllSkills: boolean = false;

  toggleShowAllSkills() {
    this.showAllSkills = !this.showAllSkills;
  }

  // Status badge background and text colors
  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      pending: 'bg-amber-100 text-amber-800 border border-amber-200',
      under_review: 'bg-blue-100 text-blue-800 border border-blue-200',
      in_review: 'bg-blue-100 text-blue-800 border border-blue-200',
      reviewing: 'bg-blue-100 text-blue-800 border border-blue-200',
      shortlisted: 'bg-purple-100 text-purple-800 border border-purple-200',
      interview_scheduled:
        'bg-indigo-100 text-indigo-800 border border-indigo-200',
      interviewed: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
      selected: 'bg-green-100 text-green-800 border border-green-200',
      hired: 'bg-green-100 text-green-800 border border-green-200',
      accepted: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      rejected: 'bg-red-100 text-red-800 border border-red-200',
      declined: 'bg-gray-100 text-gray-800 border border-gray-200',
      withdrawn: 'bg-gray-100 text-gray-800 border border-gray-200',
      on_hold: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      paused: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    };

    return (
      statusColors[status.toLowerCase()] ||
      'bg-gray-100 text-gray-800 border border-gray-200'
    );
  }

  // Status dot indicator colors (for the small circular indicators)
  getStatusDotColor(status: string): string {
    const dotColors: { [key: string]: string } = {
      pending: 'bg-amber-400',
      under_review: 'bg-blue-400',
      in_review: 'bg-blue-400',
      reviewing: 'bg-blue-400',
      shortlisted: 'bg-purple-400',
      interview_scheduled: 'bg-indigo-400',
      interviewed: 'bg-cyan-400',
      selected: 'bg-green-400',
      hired: 'bg-green-400',
      accepted: 'bg-emerald-400',
      rejected: 'bg-red-400',
      declined: 'bg-gray-400',
      withdrawn: 'bg-gray-400',
      on_hold: 'bg-yellow-400',
      paused: 'bg-yellow-400',
    };

    return dotColors[status.toLowerCase()] || 'bg-gray-400';
  }

  // Optional: Get status priority for sorting (higher number = higher priority)
  getStatusPriority(status: string): number {
    const priorities: { [key: string]: number } = {
      hired: 10,
      accepted: 9,
      selected: 8,
      interviewed: 7,
      interview_scheduled: 6,
      shortlisted: 5,
      under_review: 4,
      in_review: 4,
      reviewing: 4,
      pending: 3,
      on_hold: 2,
      paused: 2,
      rejected: 1,
      declined: 1,
      withdrawn: 1,
    };

    return priorities[status.toLowerCase()] || 0;
  }

  // Optional: Get human-readable status text
  getStatusDisplayText(status: string): string {
    const displayTexts: { [key: string]: string } = {
      pending: 'Pending Review',
      under_review: 'Under Review',
      in_review: 'In Review',
      reviewing: 'Reviewing',
      shortlisted: 'Shortlisted',
      interview_scheduled: 'Interview Scheduled',
      interviewed: 'Interviewed',
      selected: 'Selected',
      hired: 'Hired',
      accepted: 'Offer Accepted',
      rejected: 'Rejected',
      declined: 'Declined',
      withdrawn: 'Withdrawn',
      on_hold: 'On Hold',
      paused: 'Paused',
    };

    return (
      displayTexts[status.toLowerCase()] ||
      status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    );
  }

  // Optional: Check if status is active/positive
  isActiveStatus(status: string): boolean {
    const activeStatuses = [
      'pending',
      'under_review',
      'in_review',
      'reviewing',
      'shortlisted',
      'interview_scheduled',
      'interviewed',
      'selected',
      'hired',
      'accepted',
    ];

    return activeStatuses.includes(status.toLowerCase());
  }

  // Optional: Check if status is final/concluded
  isFinalStatus(status: string): boolean {
    const finalStatuses = [
      'hired',
      'accepted',
      'rejected',
      'declined',
      'withdrawn',
    ];
    return finalStatuses.includes(status.toLowerCase());
  }

  isNew(dateApplied: string | Date): boolean {
    if (!dateApplied) return false;
    const appliedDate = new Date(dateApplied);
    const now = new Date();
    const diffInMs = now.getTime() - appliedDate.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    return diffInDays <= 3; // Mark as 'New' if applied within the last 3 days
  }
}
