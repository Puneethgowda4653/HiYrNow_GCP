import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  template: `
    <div [ngClass]="containerClasses">
      <div *ngIf="title" class="px-6 pt-5 pb-3 border-b border-gray-100">
        <h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3>
        <p *ngIf="subtitle" class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
      </div>
      <div class="p-6">
        <ng-content />
      </div>
      <div *ngIf="hasActions" class="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <ng-content select="[card-actions]" />
      </div>
    </div>
  `,
})
export class UiCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() elevated = true;
  @Input() hasActions = false;

  get containerClasses(): string {
    const classes = [
      'bg-white',
      'rounded-2xl',
      this.elevated ? 'shadow' : 'shadow-none',
      'border',
      'border-gray-100',
      'transition-all',
      'duration-300',
    ];
    if (this.elevated) {
      classes.push('hover:shadow-lg');
    }
    return classes.join(' ');
  }
}


