import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-resume-view',
  templateUrl: './resume-view.component.html',
})
export class ResumeViewComponent {
  constructor(private dialogRef: MatDialogRef<ResumeViewComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}

  closeDialog(): void {
    this.dialogRef.close();
  }
}
