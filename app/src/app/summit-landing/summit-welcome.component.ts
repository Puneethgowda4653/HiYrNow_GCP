import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-summit-welcome',
  template: `
    <main class="min-h-[60vh] flex items-center justify-center bg-background px-4">
      <section class="max-w-lg w-full bg-white rounded-2xl shadow-elev-md p-8 text-center">
        <h1 class="text-2xl md:text-3xl font-bold text-text-primary">
          You’re in for the Summit
        </h1>
        <p class="mt-3 text-sm md:text-base text-text-secondary">
          We’ve saved your Summit access token. A member of the HiYrNow team will follow up with next steps shortly.
        </p>
        <p class="mt-4 text-xs text-text-muted" *ngIf="token">
          Reference token:
          <code class="font-mono bg-slate-100 px-1 py-0.5 rounded">{{ token }}</code>
        </p>
        <p class="mt-6 text-sm text-text-secondary">
          Need help? Email
          <a href="mailto:hello@hiyrnow.in" class="underline">hellohiyrnow.in</a>.
        </p>
      </section>
    </main>
  `,
})
export class SummitWelcomeComponent implements OnInit {
  token: string | null = null;

  ngOnInit(): void {
    // Prefer token from URL, else fall back to sessionStorage
    const params = new URLSearchParams(window.location.search);
    this.token = params.get('token');
    if (!this.token) {
      try {
        this.token = sessionStorage.getItem('hiyrnow_summit_token');
      } catch {
        this.token = null;
      }
    }
  }
}


