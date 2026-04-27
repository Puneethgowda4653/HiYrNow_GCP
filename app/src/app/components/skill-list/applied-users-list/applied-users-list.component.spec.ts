import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppliedUsersListComponent } from './applied-users-list.component';

describe('AppliedUsersListComponent', () => {
  let component: AppliedUsersListComponent;
  let fixture: ComponentFixture<AppliedUsersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppliedUsersListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AppliedUsersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
