import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-role-card',
  standalone: false,
  templateUrl: './role-card.component.html',
  styleUrls: ['./role-card.component.css']
})
export class RoleCardComponent {
  @Input() role: 'jobseeker' | 'recruiter' = 'jobseeker';
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() icon: string = '';
  @Input() benefits: string[] = [];
  @Output() selected = new EventEmitter<'jobseeker' | 'recruiter'>();

  onSelect() {
    this.selected.emit(this.role);
  }
}

