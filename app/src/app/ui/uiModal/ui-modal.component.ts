import { Component, EventEmitter, Input, Output } from '@angular/core';

type UiModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-ui-modal',
  template: `
    <div class="w-full">
      <div class="rounded-2xl bg-white border border-gray-100 shadow-elev-md overflow-hidden">
        <div class="flex items-start justify-between px-6 py-4 border-b border-gray-100 bg-surface">
          <div class="min-w-0">
            <h3 class="text-lg font-semibold text-text truncate" [attr.id]="titleId">{{ title }}</h3>
            <p *ngIf="subtitle" class="text-sm text-text-muted mt-0.5">{{ subtitle }}</p>
          </div>
          <button *ngIf="showClose" (click)="close.emit()" class="p-2 rounded-xl hover:bg-primary/10 text-text-muted" aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6">
          <ng-content />
        </div>

        <div *ngIf="hasActions" class="px-6 py-4 border-t border-gray-100 bg-surface-muted">
          <div class="flex items-center justify-end gap-3">
            <ng-content select="[modal-actions]" />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class UiModalComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() showClose = true;
  @Input() hasActions = true;
  @Input() size: UiModalSize = 'md';
  @Output() close = new EventEmitter<void>();

  get titleId(): string { return `ui-modal-title`; }
}


