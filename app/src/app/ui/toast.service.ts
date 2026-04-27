import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class UiToastService {
  constructor(private toastr: ToastrService) {}

  success(message: string, title?: string) {
    this.toastr.success(message, title, {
      toastClass: 'ngx-toastr hn-btn rounded-2xl',
    });
  }

  error(message: string, title?: string) {
    this.toastr.error(message, title, {
      toastClass: 'ngx-toastr hn-btn rounded-2xl',
    });
  }

  info(message: string, title?: string) {
    this.toastr.info(message, title, {
      toastClass: 'ngx-toastr hn-btn rounded-2xl',
    });
  }

  warning(message: string, title?: string) {
    this.toastr.warning(message, title, {
      toastClass: 'ngx-toastr hn-btn rounded-2xl',
    });
  }

  /**
   * Show autosave notification with timestamp
   */
  autosave(saved: boolean, timestamp?: Date) {
    if (saved) {
      const timeStr = timestamp 
        ? timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : 'now';
      this.toastr.success(`Saved at ${timeStr}`, 'Autosaved', {
        toastClass: 'ngx-toastr hn-btn rounded-2xl',
        timeOut: 2000,
        positionClass: 'toast-top-right'
      });
    } else {
      this.toastr.error('Failed to save changes', 'Autosave Error', {
        toastClass: 'ngx-toastr hn-btn rounded-2xl',
        timeOut: 3000,
        positionClass: 'toast-top-right'
      });
    }
  }
}


