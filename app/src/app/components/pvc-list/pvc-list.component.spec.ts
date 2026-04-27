import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PVCListComponent } from './pvc-list.component';

describe('PVCListComponent', () => {
  let component: PVCListComponent;
  let fixture: ComponentFixture<PVCListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PVCListComponent]
    });
    fixture = TestBed.createComponent(PVCListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
