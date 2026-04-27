import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatchedProfileViewComponent } from './matched-profile-view.component';

describe('MatchedProfileViewComponent', () => {
  let component: MatchedProfileViewComponent;
  let fixture: ComponentFixture<MatchedProfileViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchedProfileViewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MatchedProfileViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
