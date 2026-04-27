import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-matched-users-list',

  templateUrl: './matched-users-list.component.html',
  styleUrl: './matched-users-list.component.css',
})
export class MatchedUsersListComponent {
  @Input() candidates: any[] = [];
  @Input() jobId!: string;
  @Input() getUserProfilePicUrl!: (candidate: any) => string;
  @Input() setDefaultProfilePic!: (candidate: any) => void;
  @Input() openAIAnalysisModal!: (candidate: any) => void;
}
