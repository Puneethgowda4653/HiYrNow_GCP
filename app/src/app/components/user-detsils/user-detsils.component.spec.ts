import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserDetsilsComponent } from './user-detsils.component';

describe('UserDetsilsComponent', () => {
  let component: UserDetsilsComponent;
  let fixture: ComponentFixture<UserDetsilsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDetsilsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserDetsilsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
