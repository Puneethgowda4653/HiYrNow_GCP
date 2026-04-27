import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-ask',
  templateUrl: './ask.component.html',
  styleUrls: ['./ask.component.css']
})
export class AskComponent {
  helpForm: FormGroup;
  topics = ['General', 'Job postings', 'Billing', 'Account access', 'Applicants', 'Other'];
  selectedTopic = 'General';

  constructor(private fb: FormBuilder) {
    this.helpForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      query: ['', Validators.required]
    });
  }

  selectTopic(topic: string) {
    this.selectedTopic = topic;
  }

  onSubmit() {
    if (this.helpForm.valid) {
      console.log('Form Submitted', { ...this.helpForm.value, topic: this.selectedTopic });
      // TODO: wire up to your API
    } else {
      this.helpForm.markAllAsTouched();
    }
  }
}