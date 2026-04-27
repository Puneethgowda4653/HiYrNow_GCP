import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SummitLandingComponent } from './summit-landing.component';
import { SummitService } from './summit.service';
import { SummitAnalyticsService } from './summit-analytics.service';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ToastrModule } from 'ngx-toastr';
import { Title, Meta } from '@angular/platform-browser';

describe('SummitLandingComponent', () => {
  let component: SummitLandingComponent;
  let fixture: ComponentFixture<SummitLandingComponent>;
  let summitService: jasmine.SpyObj<SummitService>;
  let analytics: jasmine.SpyObj<SummitAnalyticsService>;

  beforeEach(async () => {
    const summitSpy = jasmine.createSpyObj('SummitService', ['register']);
    const analyticsSpy = jasmine.createSpyObj('SummitAnalyticsService', [
      'trackEvent',
      'trackSummitSignupSuccess',
    ]);

    await TestBed.configureTestingModule({
      declarations: [SummitLandingComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        ToastrModule.forRoot(),
      ],
      providers: [
        Title,
        Meta,
        { provide: SummitService, useValue: summitSpy },
        { provide: SummitAnalyticsService, useValue: analyticsSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SummitLandingComponent);
    component = fixture.componentInstance;
    summitService = TestBed.inject(SummitService) as jasmine.SpyObj<SummitService>;
    analytics = TestBed.inject(
      SummitAnalyticsService
    ) as jasmine.SpyObj<SummitAnalyticsService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form when empty', () => {
    expect(component.form.valid).toBeFalse();
    expect(component.name?.valid).toBeFalse();
    expect(component.workEmail?.valid).toBeFalse();
    expect(component.phone?.valid).toBeFalse();
  });

  it('should validate form fields correctly', () => {
    component.form.setValue({
      name: 'A',
      workEmail: 'invalid',
      phone: '123',
      companyName: '',
    });
    expect(component.form.valid).toBeFalse();

    component.form.setValue({
      name: 'Valid Name',
      workEmail: 'test@example.com',
      phone: '1234567890',
      companyName: 'Company',
    });
    expect(component.form.valid).toBeTrue();
  });

  it('should call SummitService.register and handle success', fakeAsync(() => {
    summitService.register.and.returnValue(
      of({
        ok: true,
        signupToken: 'test-token',
        nextUrl: '',
      })
    );
    analytics.trackSummitSignupSuccess.and.returnValue(Promise.resolve());

    component.form.setValue({
      name: 'Valid Name',
      workEmail: 'user@example.com',
      phone: '1234567890',
      companyName: 'Company',
    });

    component.onSubmit();
    tick();

    expect(summitService.register).toHaveBeenCalled();
    expect(analytics.trackEvent).toHaveBeenCalledWith('summit_signup_started', {
      campaign: undefined,
    });
  }));

  it('should handle server validation errors (400)', fakeAsync(() => {
    summitService.register.and.returnValue(
      throwError(() => ({
        status: 400,
        error: {
          workEmail: 'Email already used',
        },
      }))
    );

    component.form.setValue({
      name: 'Valid Name',
      workEmail: 'user@example.com',
      phone: '1234567890',
      companyName: 'Company',
    });

    component.onSubmit();
    tick();

    expect(component.serverErrors['workEmail']).toBe('Email already used');
  }));
});


