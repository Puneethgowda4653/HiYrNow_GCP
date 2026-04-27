import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditJobPostingComponent } from './edit-job-posting.component';

describe('EditJobPostingComponent', () => {
  let component: EditJobPostingComponent;
  let fixture: ComponentFixture<EditJobPostingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditJobPostingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditJobPostingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
