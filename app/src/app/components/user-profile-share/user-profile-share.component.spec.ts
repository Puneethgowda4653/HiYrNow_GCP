import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserProfileShareComponent } from './user-profile-share.component';

describe('UserProfileShareComponent', () => {
  let component: UserProfileShareComponent;
  let fixture: ComponentFixture<UserProfileShareComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UserProfileShareComponent]
    });
    fixture = TestBed.createComponent(UserProfileShareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
