import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBioModalComponent } from './edit-bio-modal.component';

describe('EditBioModalComponent', () => {
  let component: EditBioModalComponent;
  let fixture: ComponentFixture<EditBioModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditBioModalComponent]
    });
    fixture = TestBed.createComponent(EditBioModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
