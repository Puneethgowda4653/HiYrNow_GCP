import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import {
  RecruiterNotificationService,
  Notification,
  BulkNotificationRequest,
} from '../../services/recruiter-notification.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-notification-modal',
  templateUrl: './notification-modal.component.html',
  styleUrls: ['./notification-modal.component.css'],
})
export class NotificationModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() recipientIds: string[] = [];
  @Input() recipientNames: string[] = [];
  @Input() jobId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() sent = new EventEmitter<Notification>();

  notificationType: 'email' | 'whatsapp' | 'in-app' = 'email';
  title = '';
  message = '';
  isSending = false;
  isLoadingTemplates = false;
  templates: Array<{ id: string; title: string; message: string; type: string }> = [];
  selectedTemplateId?: string;

  notificationTypes = [
    { value: 'email', label: 'Email', icon: '✉️' },
    { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { value: 'in-app', label: 'In-App', icon: '🔔' },
  ];

  constructor(
    private notificationService: RecruiterNotificationService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.isLoadingTemplates = true;
    this.notificationService.getNotificationTemplates().subscribe({
      next: (templates) => {
        this.templates = templates;
        this.isLoadingTemplates = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.isLoadingTemplates = false;
      },
    });
  }

  selectTemplate(templateId: string) {
    const template = this.templates.find((t) => t.id === templateId);
    if (template) {
      this.selectedTemplateId = templateId;
      this.title = template.title;
      this.message = template.message;
      this.notificationType = template.type as any;
    }
  }

  sendNotification() {
    if (!this.title || !this.message || this.recipientIds.length === 0) {
      this.toastr.error(
        'Please fill in all fields and select at least one recipient'
      );
      return;
    }

    this.isSending = true;

    const request: BulkNotificationRequest = {
      recipientIds: this.recipientIds,
      type: this.notificationType,
      title: this.title,
      message: this.message,
      jobId: this.jobId,
    };

    this.notificationService.sendBulkNotification(request).subscribe({
      next: (result) => {
        this.isSending = false;
        this.toastr.success(
          `Notification sent to ${result.sent} recipient(s)`
        );
        this.reset();
        this.close.emit();
      },
      error: (error) => {
        this.isSending = false;
        console.error('Error sending notification:', error);
        this.toastr.error('Failed to send notification');
      },
    });
  }

  reset() {
    this.title = '';
    this.message = '';
    this.notificationType = 'email';
    this.selectedTemplateId = undefined;
  }

  closeModal() {
    this.close.emit();
  }

  get recipientCount(): number {
    return this.recipientIds.length;
  }
}

