import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCreditManagementComponent } from './admin-credit-management.component';

describe('AdminCreditManagementComponent', () => {
  let component: AdminCreditManagementComponent;
  let fixture: ComponentFixture<AdminCreditManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCreditManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminCreditManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
