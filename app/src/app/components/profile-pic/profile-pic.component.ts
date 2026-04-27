import { Component } from '@angular/core';
import { UserService } from '../../services/user.service';
import { NgxFileDropEntry } from 'ngx-file-drop';

@Component({
  selector: 'app-profile-pic',
  templateUrl: './profile-pic.component.html',
  styleUrls: ['./profile-pic.component.css'],
})
export class ProfilePicComponent {
  user: any;
  profilePicUrl: any;
  profilePicExist: boolean = false;
  isCurrentUser: any;

  constructor(private userService: UserService) {}
  onProfilePicSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('profilePic', file, file.name);
      // formData.append('userId', this.user._id);

      this.userService.uploadProfilePic(formData).subscribe(
        (response: any) => {
          if (response.file_uploaded) {
            this.profilePicUrl = response.profilePicUrl;
            this.profilePicExist = true;
            this.closeProfilePicModal();
            alert('uploaded successfully');

            // Refresh the data
            setTimeout(() => {
              // this.loadUserData();
            }, 1000);
          }
        },
        (error) => console.error('Error uploading file:', error)
      );
    }
  }
  closeProfilePicModal() {
    throw new Error('Method not implemented.');
  }

  droppedProfilePic(files: NgxFileDropEntry[]): void {
    // Only allow profile pic updates for current user
    if (!this.isCurrentUser) return;

    for (const droppedFile of files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          const formData = new FormData();
          formData.append('profilePic', file, file.name);
          formData.append('userId', this.user._id);

          this.userService.uploadProfilePic(formData).subscribe(
            (response: any) => {
              if (response.file_uploaded) {
                this.profilePicUrl = response.profilePicUrl;
                this.profilePicExist = true;
                this.closeProfilePicModal();
                alert('uploaded successfully');

                // Refresh the data
                setTimeout(() => {
                  // this.loadUserData();
                }, 1000);
              }
            },
            (error) => console.error('Error uploading file:', error)
          );
        });
      }
    }
  }
}
