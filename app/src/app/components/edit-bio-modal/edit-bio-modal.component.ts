// edit-bio-modal.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-edit-bio-modal',
  templateUrl: './edit-bio-modal.component.html',
  styleUrls: ['./edit-bio-modal.component.css']
})
export class EditBioModalComponent {
  @Input() firstName: string = '';
  @Input() lastName: string = '';
  @Input() tagline: string = '';

  @Output() save = new EventEmitter<{ firstName: string, lastName: string, tagline: string }>();
  @Output() cancel = new EventEmitter<void>();

  onSave() {
    this.save.emit({ firstName: this.firstName, lastName: this.lastName, tagline: this.tagline });
  }

  onCancel() {
    this.cancel.emit();
  }
}
