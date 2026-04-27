import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-section-title',
  template: `
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-2">
        <div 
          *ngIf="icon"
          class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md"
          [ngClass]="iconGradient"
        >
          <i [class]="'fas fa-' + icon + ' text-white text-lg'"></i>
        </div>
        <h2 
          class="text-2xl lg:text-3xl font-bold text-gray-900"
        >
          {{ title }}
        </h2>
      </div>
      <p *ngIf="subtitle" class="text-sm text-gray-600" [ngClass]="{'ml-13': icon}">
        {{ subtitle }}
      </p>
    </div>
  `,
})
export class UiSectionTitleComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() iconColor: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' = 'primary';

  get iconGradient(): string {
    const gradients: Record<string, string> = {
      primary: 'from-[#6254E5] to-[#8B73FF]',
      secondary: 'from-[#8B73FF] to-[#4D3CD3]',
      success: 'from-emerald-500 to-emerald-600',
      warning: 'from-amber-500 to-amber-600',
      danger: 'from-red-500 to-red-600',
    };
    return gradients[this.iconColor] || gradients['primary'];
  }
}

