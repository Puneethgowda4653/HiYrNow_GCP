import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchasePointsComponent } from './purchase-points.component';

describe('PurchasePointsComponent', () => {
  let component: PurchasePointsComponent;
  let fixture: ComponentFixture<PurchasePointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchasePointsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PurchasePointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
