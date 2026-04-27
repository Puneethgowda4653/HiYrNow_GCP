import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { UserService } from '../../services/user.service';
import { Subscription } from 'rxjs';

export interface ProfileCompletionScore {
  sectionsCompleted: number;
  totalSections: number;
  remainingSections: string[];
  score: number;
}

@Component({
  selector: 'app-profile-summary',
  templateUrl: './profile-summary.component.html',
  styleUrls: ['./profile-summary.component.css']
})
export class ProfileSummaryComponent implements OnInit, OnDestroy {
  @Input() userId!: string;
  @Input() user: any;
  @Input() isCurrentUser: boolean = false;

  completionScore: ProfileCompletionScore | null = null;
  isLoading = true;
  private subscription?: Subscription;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    if (this.userId) {
      this.loadCompletionScore();
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private loadCompletionScore(): void {
    this.isLoading = true;
    this.subscription = this.userService.getProfileCompletionScore(this.userId).subscribe({
      next: (score) => {
        this.completionScore = score;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading completion score:', error);
        this.isLoading = false;
      }
    });
  }

  get progressPercentage(): number {
    if (!this.completionScore) return 0;
    return Math.round((this.completionScore.sectionsCompleted / this.completionScore.totalSections) * 100);
  }

  get progressColor(): string {
    const percentage = this.progressPercentage;
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 50) return 'bg-primary';
    return 'bg-warning';
  }

  get remainingSections(): string[] {
    return this.completionScore?.remainingSections || [];
  }
}

