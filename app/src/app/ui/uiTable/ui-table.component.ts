import { Component, Input } from '@angular/core';

type UiTableDensity = 'comfortable' | 'compact';

@Component({
  selector: 'app-ui-table',
  template: `
    <div class="overflow-auto rounded-2xl border border-gray-200 shadow-sm">
      <table class="min-w-full text-sm">
        <ng-content select="thead"></ng-content>
        <ng-content select="tbody"></ng-content>
      </table>
    </div>
  `,
})
export class UiTableComponent {
  @Input() density: UiTableDensity = 'comfortable';
}



