import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pvc-users-list',

  templateUrl: './pvc-users-list.component.html',
  styleUrl: './pvc-users-list.component.css',
})
export class PvcUsersListComponent {
  @Input() candidates: any[] = [];
  @Input() jobId!: string;
  @Input() getUserProfilePicUrl!: (candidate: any) => string;
  @Input() setDefaultProfilePic!: (candidate: any) => void;
}
