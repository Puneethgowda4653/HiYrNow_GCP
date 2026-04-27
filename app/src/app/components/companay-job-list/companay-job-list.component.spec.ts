import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanayJobListComponent } from './companay-job-list.component';

describe('CompanayJobListComponent', () => {
  let component: CompanayJobListComponent;
  let fixture: ComponentFixture<CompanayJobListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanayJobListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CompanayJobListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
