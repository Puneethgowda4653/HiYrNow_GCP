import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PvcUsersListComponent } from './pvc-users-list.component';

describe('PvcUsersListComponent', () => {
  let component: PvcUsersListComponent;
  let fixture: ComponentFixture<PvcUsersListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PvcUsersListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PvcUsersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
