import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-metric-card',
  template: `
    <div 
      class="group relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/60 p-6 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300"
      [ngClass]="{'cursor-pointer': clickable}"
    >
      <!-- Decorative gradient blob -->
     

      <div class="flex items-start justify-between relative z-10">
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-600 mb-2">
            {{ label }}
          </p>
          <p class="text-4xl font-bold mb-3" [ngClass]="valueColorClass">
            {{ value }}
          </p>
          
          <!-- Trend indicator -->
          <div *ngIf="trend" class="flex items-center gap-2">
            <div 
              class="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
              [ngClass]="trendClasses"
            >
              <i [class]="'fas ' + trendIcon + ' text-xs'"></i>
              {{ trend }}
            </div>
            <span class="text-xs text-gray-500">{{ trendLabel || 'vs last month' }}</span>
          </div>

          <!-- Subtext -->
          <p *ngIf="subtext" class="text-xs text-gray-500 mt-2">
            {{ subtext }}
          </p>
        </div>

        <!-- Icon -->
        <div 
          class="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
          [ngClass]="iconBgClass"
        >
          <i [class]="'fas fa-' + icon + ' text-2xl'" [ngClass]="iconColorClass"></i>
        </div>
      </div>

      <!-- Optional action button -->
      <button 
        *ngIf="actionText"
        class="mt-4 w-full py-2 text-sm font-semibold rounded-lg transition-all duration-200"
        [ngClass]="actionButtonClass"
      >
        {{ actionText }}
        <i class="fas fa-arrow-right ml-2 text-xs"></i>
      </button>
    </div>
  `,
})
export class UiMetricCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() icon = 'chart-line';
  @Input() trend = '';
  @Input() trendLabel = '';
  @Input() trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
  @Input() subtext = '';
  @Input() actionText = '';
  @Input() clickable = false;
  @Input() color: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'primary';

  get gradientClass(): string {
    const gradients: Record<string, string> = {
      primary: 'bg-gradient-to-br from-[#6254E5] to-[#8B73FF]',
      success: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      warning: 'bg-gradient-to-br from-amber-500 to-amber-600',
      danger: 'bg-gradient-to-br from-red-500 to-red-600',
      info: 'bg-gradient-to-br from-blue-500 to-blue-600',
    };
    return gradients[this.color] || gradients['primary'];
  }

  get valueColorClass(): string {
    const colors: Record<string, string> = {
      primary: 'text-[#6254E5]',
      success: 'text-emerald-600',
      warning: 'text-amber-600',
      danger: 'text-red-600',
      info: 'text-blue-600',
    };
    return colors[this.color] || colors['primary'];
  }

  get iconBgClass(): string {
    const bgColors: Record<string, string> = {
      primary: 'bg-gradient-to-br from-[#6254E5]/10 to-[#8B73FF]/10',
      success: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/10',
      warning: 'bg-gradient-to-br from-amber-500/10 to-amber-600/10',
      danger: 'bg-gradient-to-br from-red-500/10 to-red-600/10',
      info: 'bg-gradient-to-br from-blue-500/10 to-blue-600/10',
    };
    return bgColors[this.color] || bgColors['primary'];
  }

  get iconColorClass(): string {
    const colors: Record<string, string> = {
      primary: 'text-[#6254E5]',
      success: 'text-emerald-600',
      warning: 'text-amber-600',
      danger: 'text-red-600',
      info: 'text-blue-600',
    };
    return colors[this.color] || colors['primary'];
  }

  get trendIcon(): string {
    if (this.trendDirection === 'up') return 'fa-arrow-up';
    if (this.trendDirection === 'down') return 'fa-arrow-down';
    return 'fa-minus';
  }

  get trendClasses(): string[] {
    if (this.trendDirection === 'up') {
      return ['bg-emerald-100', 'text-emerald-700'];
    } else if (this.trendDirection === 'down') {
      return ['bg-red-100', 'text-red-700'];
    }
    return ['bg-gray-100', 'text-gray-700'];
  }

  get actionButtonClass(): string {
    const buttonStyles: Record<string, string> = {
      primary: 'bg-[#6254E5]/10 text-[#6254E5] hover:bg-[#6254E5]/20',
      success: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
      warning: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
      danger: 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
      info: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
    };
    return buttonStyles[this.color] || buttonStyles['primary'];
  }
}

