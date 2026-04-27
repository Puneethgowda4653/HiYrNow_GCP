import { Component, Input } from '@angular/core';

type UiButtonVariant = 'primary' | 'secondary' | 'ghost';
type UiButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-ui-button',
  template: `
    <button
      [disabled]="disabled"
      [ngClass]="buttonClasses"
      [attr.type]="type"
    >
      <ng-content />
    </button>
  `,
})
export class UiButtonComponent {
  @Input() variant: UiButtonVariant = 'primary';
  @Input() size: UiButtonSize = 'md';
  @Input() block = false;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  get buttonClasses(): string[] {
  const base = [
    'hn-btn',
    'rounded-2xl',
    'font-semibold',
    'transition-all',
    'duration-200',
    'disabled:opacity-60',
    'disabled:cursor-not-allowed',
  ];

  const sizes: Record<UiButtonSize, string[]> = {
    sm: ['px-3', 'py-2', 'text-sm'],
    md: ['px-4', 'py-2.5', 'text-sm'],
    lg: ['px-6', 'py-3', 'text-base'],
  };

  const variants: Record<UiButtonVariant, string[]> = {
    primary: ['text-white', 'bg-gradient-to-r', 'from-brand-start', 'to-brand-end', 'shadow'],
    secondary: ['hn-btn-outline'],
    ghost: ['text-primary', 'hover:bg-primary/5'],
  };

  // ✅ Fallback to 'primary' if variant is not valid
  const chosenVariant = variants[this.variant] ?? variants['primary'];
  const width = this.block ? ['w-full'] : [];

  return [...base, ...sizes[this.size], ...chosenVariant, ...width];
}
}