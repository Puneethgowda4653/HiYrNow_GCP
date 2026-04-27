import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditPointsComponent } from './credit-points.component';

describe('CreditPointsComponent', () => {
  let component: CreditPointsComponent;
  let fixture: ComponentFixture<CreditPointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditPointsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreditPointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
