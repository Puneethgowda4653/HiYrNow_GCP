import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Output,
  EventEmitter,
} from '@angular/core';
import { ResumeUploadService } from '../../../services/resume-upload.service';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { ToastrService } from 'ngx-toastr';
import { trigger, transition, style, animate } from '@angular/animations';
declare var bootstrap: any;

@Component({
  selector: 'app-resume-upload',
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('300ms ease-in', style({ opacity: 0 }))]),
    ]),
    trigger('slideUpDown', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate(
          '300ms ease-out',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({ transform: 'translateY(20px)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class ResumeUploadComponent implements OnInit, AfterViewInit {
  files: any[] = [];
  filesExist: boolean = false;
  isModalOpen: boolean = false;
  isParsing: boolean = false;
  isUploading: boolean = false;
  @ViewChild('uploadModal') uploadModal!: ElementRef;
  @Output() resumeParsed = new EventEmitter<void>();

  private modalInstance: any;

  constructor(
    private resumeUploadService: ResumeUploadService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.fetchFileNames();
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        this.toastr.error('File size exceeds 10MB limit');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        this.toastr.error('Please upload a PDF, DOC, or DOCX file');
        return;
      }

      const formData = new FormData();
      formData.append('file', file, file.name);

      this.isUploading = true;
      this.resumeUploadService.uploadFile(formData).subscribe(
        () => {
          this.isUploading = false;
          this.isModalOpen = false;
          this.toastr.success('Upload successful', 'Success');
          this.fetchFileNames(); // Refresh file list
          this.isParsing = true; // Start loader
          this.resumeUploadService.parseResume().subscribe(
            () => {
              this.isParsing = false; // Stop loader
              this.toastr.success('Resume parsed successfully', 'Success');
              // Emit event to notify parent component (onboarding)
              this.resumeParsed.emit();
            },
            (error: any) => {
              this.isParsing = false; // Stop loader
              console.error('Error parsing resume:', error);
              this.toastr.error('Resume parsing failed', 'Error');
            }
          );
        },
        (error: any) => {
          this.isUploading = false;
          console.error('Error uploading file:', error);
          this.toastr.error('Upload failed. Please try again.', 'Error');
        }
      );
    }
  }

  openGoogleDrivePicker() {
    // Implement Google Drive picker integration here
    console.log('Open Google Drive picker');
  }
  ngAfterViewInit() {
    if (this.uploadModal) {
      this.modalInstance = new bootstrap.Modal(this.uploadModal.nativeElement);
    }
  }

  fetchFileNames() {
  this.resumeUploadService.showFileNames().subscribe(
    (response: any[]) => {
      if (response && response.length > 0) {
        const latestFile = response[response.length - 1];
        this.files = [{
          filename: latestFile.filename,
          originalname: latestFile.originalname,
          contentType: latestFile.contentType,
          uploadDate: latestFile.uploadDate,
        }];
        this.filesExist = true;
      } else {
        this.files = [];
        this.filesExist = false;
      }
    },
    (error) => {
      // 404 = no resume uploaded yet, treat as empty not an error
      if (error?.status === 404) {
        this.files = [];
        this.filesExist = false;
      }
      // all other errors are real errors — do nothing, just suppress console noise
    }
  );
}

  getUploadUrl(): string {
    return this.resumeUploadService.url;
  }

  public dropped(files: NgxFileDropEntry[]) {
    for (const droppedFile of files) {
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          // Validate file size (10MB max)
          const maxSize = 10 * 1024 * 1024; // 10MB in bytes
          if (file.size > maxSize) {
            this.toastr.error('File size exceeds 10MB limit', 'Error');
            return;
          }

          // Validate file type
          const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          if (!allowedTypes.includes(file.type)) {
            this.toastr.error('Please upload a PDF, DOC, or DOCX file', 'Error');
            return;
          }

          const formData = new FormData();
          formData.append('file', file, droppedFile.relativePath);
          
          this.isUploading = true;
          this.resumeUploadService.uploadFile(formData).subscribe(
            () => {
              this.isUploading = false;
              this.toastr.success('Upload successful', 'Success');
              this.closeModal();
              this.fetchFileNames();
              this.isParsing = true; // Start loader
              this.resumeUploadService.parseResume().subscribe(
                () => {
                  this.isParsing = false; // Stop loader
                  this.toastr.success('Resume parsed successfully', 'Success');
                  // Emit event to notify parent component (onboarding)
                  this.resumeParsed.emit();
                },
                (error: any) => {
                  this.isParsing = false; // Stop loader
                  console.error('Error parsing resume:', error);
                  this.toastr.error('Resume parsing failed', 'Error');
                }
              );
            },
            (error: any) => {
              this.isUploading = false;
              console.error('Error uploading file:', error);
              this.toastr.error('Upload failed. Please try again.', 'Error');
            }
          );
        });
      }
    }
  }

  downloadPdf(filename: string, contentType: string) {
    this.resumeUploadService.downloadPDF(filename).subscribe(
      (res: Blob) => {
        const file = new Blob([res], { type: contentType });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL);
      },
      (error) => {
        console.error('Error downloading PDF:', error);
      }
    );
  }

  openUploadModal() {
    if (this.modalInstance) {
      this.modalInstance.show();
    } else {
      console.error('uploadModal is not defined');
    }
  }

  closeUploadModal() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    } else {
      console.error('uploadModal is not defined');
    }
  }
}
