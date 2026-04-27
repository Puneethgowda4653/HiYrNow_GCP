import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyPublicProfileComponent } from './company-public-profile.component';

describe('CompanyPublicProfileComponent', () => {
  let component: CompanyPublicProfileComponent;
  let fixture: ComponentFixture<CompanyPublicProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyPublicProfileComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CompanyPublicProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
