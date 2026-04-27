import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms-conditions',

  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.css'],
})
export class TermsConditionsComponent {
  agreed = false;

  onAgreementChange(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    this.agreed = checkbox.checked;
  }
}
