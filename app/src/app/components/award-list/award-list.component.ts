import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AwardService } from '../../services/award.service';

interface Award {
  _id?: string;
  title: string;
  issuer: string;
  date: { month: string; year: string };
  description: string;
  url?: string;
}

@Component({
  selector: 'app-award-list',
  templateUrl: './award-list.component.html',
  styleUrls: ['./award-list.component.css']
})
export class AwardListComponent implements OnInit {
  awardForm!: FormGroup;
  awards: Award[] = [];
  months: string[] = [];
  years: string[] = [];
  isLoading = false;
  addMode = false;
  editMode = false;
  currentAwardId?: string;
  user: any;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private awardService: AwardService
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.awardForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      issuer: ['', [Validators.required, Validators.minLength(2)]],
      month: ['', Validators.required],
      year: ['', Validators.required],
      description: [''],
      url: ['', Validators.pattern('https?://.+')]
    });
  }

  ngOnInit(): void {
    this.initializeDates();
    this.loadAwards();
  }

  private initializeDates(): void {
    const currentYear = new Date().getFullYear();
    this.months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    this.years = Array.from({ length: 50 }, (_, i) => (currentYear - i).toString());
  }

  private async loadAwards(): Promise<void> {
    this.isLoading = true;
    try {
      this.user = await this.userService.findLoggedUser();
      if (this.user) {
        const response = await this.awardService.findAwardByUserId(this.user._id);
        this.awards = response || [];
      }
    } catch (error) {
      console.error('Error loading awards:', error);
    } finally {
      this.isLoading = false;
    }
  }

  addAward(): void {
    this.addMode = true;
    this.editMode = false;
    this.awardForm.reset();
  }

  async saveAward(): Promise<void> {
    if (this.awardForm.invalid) {
      this.markFormGroupTouched(this.awardForm);
      return;
    }

    this.isLoading = true;
    try {
      const formValue = this.awardForm.value;
      const awardData = {
        ...formValue,
        date: { month: formValue.month, year: formValue.year }
      };

      if (this.editMode && this.currentAwardId) {
        await this.awardService.updateAward(this.currentAwardId, awardData);
      } else {
        await this.awardService.createAward(awardData);
      }

      await this.loadAwards();
      this.resetForm();
    } catch (error) {
      console.error('Error saving award:', error);
    } finally {
      this.isLoading = false;
    }
  }

  editAward(award: Award): void {
    this.editMode = true;
    this.addMode = true;
    this.currentAwardId = award._id;

    this.awardForm.patchValue({
      title: award.title,
      issuer: award.issuer,
      month: award.date.month,
      year: award.date.year,
      description: award.description,
      url: award.url
    });
  }

  async deleteAward(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this award/achievement?')) {
      this.isLoading = true;
      try {
        await this.awardService.deleteAward(id);
        await this.loadAwards();
      } catch (error) {
        console.error('Error deleting award:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  resetForm(): void {
    this.awardForm.reset();
    this.editMode = false;
    this.addMode = false;
    this.currentAwardId = undefined;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.awardForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['minlength']) return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
      if (control.errors['pattern']) return 'Please enter a valid URL';
    }
    return '';
  }
}
