import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UiButtonComponent } from './uiButton/ui-button.component';
import { UiCardComponent } from './uiCard/ui-card.component';
import { UiModalComponent } from './uiModal/ui-modal.component';
import { UiBadgeComponent } from './uiBadge/ui-badge.component';
import { UiTableComponent } from './uiTable/ui-table.component';
import { UiFormFieldComponent } from './uiFormField/ui-form-field.component';
import { UiSectionTitleComponent } from './uiSectionTitle/ui-section-title.component';
import { UiMetricCardComponent } from './uiMetricCard/ui-metric-card.component';
import { RoleCardComponent } from './roleCard/role-card.component';
import { SocialButtonComponent } from './socialButton/social-button.component';
import { PasswordStrengthComponent } from './passwordStrength/password-strength.component';
import { OtpInputComponent } from './otpInput/otp-input.component';
import { ProgressStepperComponent } from './progressStepper/progress-stepper.component';

@NgModule({
  declarations: [
    UiButtonComponent, 
    UiCardComponent, 
    UiModalComponent, 
    UiBadgeComponent, 
    UiTableComponent,
    UiFormFieldComponent,
    UiSectionTitleComponent,
    UiMetricCardComponent,
    RoleCardComponent,
    SocialButtonComponent,
    PasswordStrengthComponent,
    OtpInputComponent,
    ProgressStepperComponent
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  exports: [
    UiButtonComponent, 
    UiCardComponent, 
    UiModalComponent, 
    UiBadgeComponent, 
    UiTableComponent,
    UiFormFieldComponent,
    UiSectionTitleComponent,
    UiMetricCardComponent,
    RoleCardComponent,
    SocialButtonComponent,
    PasswordStrengthComponent,
    OtpInputComponent,
    ProgressStepperComponent
  ],
})
export class UiModule {}

