import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  contactForm: FormGroup;
  isSubmitting = false;
  submitted = false;
  serverError: string | null = null;
  successMessage: string | null = null;
  baseUrl: string='';


  constructor(private fb: FormBuilder, private http: HttpClient) {
    // Determine base URL based on environment
    if (!location.toString().includes('localhost')) {
      this.baseUrl = 'https://hiyrnow-v1-721026586154.europe-west1.run.app';
    } else {
      this.baseUrl = environment.apiUrl;
    }
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(254)],
      ],
      subject: ['', [Validators.required, Validators.minLength(3)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.contactForm.get(field);
    return !!(
      (control && control.invalid && (control.touched || this.submitted)) ||
      false
    );
  }

  onSubmit(): void {
    this.submitted = true;
    this.serverError = null;
    this.successMessage = null;

    if (this.contactForm.invalid) {
      // mark all as touched so validation messages show
      this.contactForm.markAllAsTouched();
      return;
    }

    const payload = this.contactForm.value;
    this.isSubmitting = true;

    // POST to backend contact endpoint
    this.http
      .post<{ ok?: boolean; success?: boolean; message?: string }>(
        `${this.baseUrl}/api/contact`,
        payload,
        { withCredentials: true }
      )
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res) => {
          this.successMessage =
            (res && res.message) || 'Thanks — we received your message.';
          this.contactForm.reset();
          this.submitted = false;
        },
        error: (err) => {
          console.error('Contact submit error', err);
          this.serverError =
            (err?.error?.message as string) ||
            'Unable to send message. Please try again later.';
        },
      });
  }
}
