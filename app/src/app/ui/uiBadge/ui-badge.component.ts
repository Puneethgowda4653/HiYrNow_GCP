import { Component, Input } from '@angular/core';

type UiBadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
type UiBadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-ui-badge',
  template: `
    <span [ngClass]="classes"><ng-content />{{ text }}</span>
  `,
})
export class UiBadgeComponent {
  @Input() text = '';
  @Input() variant: UiBadgeVariant = 'neutral';
  @Input() size: UiBadgeSize = 'sm';
  @Input() pill = true;

  get classes(): string[] {
    const base = ['inline-flex', 'items-center', 'font-medium', 'border', 'border-transparent'];
    const size = this.size === 'sm' ? ['px-2', 'py-0.5', 'text-xs'] : ['px-3', 'py-1', 'text-sm'];
    const radius = this.pill ? ['rounded-full'] : ['rounded-2xl'];
    const variant: Record<UiBadgeVariant, string[]> = {
      neutral: ['bg-gray-100', 'text-gray-700', 'border-gray-200'],
      brand: ['bg-brand-mid/10', 'text-brand', 'border-brand-mid/20'],
      success: ['bg-green-100', 'text-green-700', 'border-green-200'],
      warning: ['bg-yellow-100', 'text-yellow-800', 'border-yellow-200'],
      danger: ['bg-red-100', 'text-red-700', 'border-red-200'],
      info: ['bg-blue-100', 'text-blue-700', 'border-blue-200'],
    };
    return [...base, ...size, ...radius, ...variant[this.variant]];
  }
}



