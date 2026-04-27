// job-application-details.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobPostingService } from '../../services/job-posting.service';
import { finalize } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { fadeIn, fadeInUp, scaleIn, slideInLeft } from '../../shared/animations';

interface Interview {
  _id: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  startDateTime: string;
}

interface Assignment {
  _id: string;
  status: 'sent' | 'submitted' | 'evaluated';
  title: string;
}

interface JobApplication {
  _id: string;
  status: 'applied' | 'shortlisted' | 'interviewing' | 'rejected' | 'accepted';
  title: string;
  company: string;
  location: string;
  dateApplied: string;
  updatedAt: string;
  jobSource: string;
  coverLetter: string;
  interviews: Interview[];
  assignment: Assignment;
  jobPosting: string;
  jobPostingDetails: any;
  comments: any[];
}

@Component({
  selector: 'app-job-application-details',
  templateUrl: './job-application-details.component.html',
  styleUrls: ['./job-application-details.component.css'],
  animations: [fadeIn, fadeInUp, scaleIn, slideInLeft]
})
export class JobApplicationDetailsComponent implements OnInit {
  application: JobApplication | null = null;
  isLoading = true;
  error: string | null = null;
  isEditing = false;
  isSaving = false;
  selectedTab: string = 'applicationDetails';
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobApplicationService: JobPostingService,
    private fb: FormBuilder
  ) {
  
  }

  ngOnInit(): void {
    const applicationId = this.route.snapshot.paramMap.get('applicationId') || '';
    
    if (applicationId) {
      this.loadApplication(applicationId);
    } else {
      this.error = 'Application ID not found';
      this.isLoading = false;
    }
  }

  selectTab(tab: string): void {
    this.selectedTab = tab; // Update selectedTab based on the clicked tab
}

  private loadApplication(id: string): void {
    this.isLoading = true;
    this.error = null;

    this.jobApplicationService.getApplicationDetailsById(id)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe(
        (application) => {
          console.log(application);
          this.application = application;
         
        },
        (error) => {
          this.error = 'Failed to load application details';
          console.error('Error loading application:', error);
        }
      );
  }



  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    const colors = {
      applied: 'bg-blue-100 text-blue-800',
      shortlisted: 'bg-purple-100 text-purple-800',
      interviewing: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  }

  getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
      'shortlisted': 'success',
      'accepted': 'success',
      'interviewing': 'warning',
      'applied': 'neutral',
      'rejected': 'danger',
    };
    return statusMap[status?.toLowerCase()] || 'neutral';
  }

  getAssignmentStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
      'submitted': 'success',
      'evaluated': 'success',
      'sent': 'warning',
    };
    return statusMap[status?.toLowerCase()] || 'neutral';
  }

  getInterviewStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
    const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
      'completed': 'success',
      'scheduled': 'warning',
      'cancelled': 'danger',
    };
    return statusMap[status?.toLowerCase()] || 'neutral';
  }

  goBack(): void {
    this.router.navigate(['/applications']);
  }

  // New method to toggle editing mode
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  // Method to calculate days ago from the date applied
  getDaysAgo(dateApplied: string): number {
    const appliedDate = new Date(dateApplied);
    const currentDate = new Date();
    const timeDiff = currentDate.getTime() - appliedDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24)); // Convert milliseconds to days
  }
}