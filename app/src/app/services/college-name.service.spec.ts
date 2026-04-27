import { TestBed } from '@angular/core/testing';

import { CollegeNameService } from './college-name.service';

describe('CollegeNameService', () => {
  let service: CollegeNameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CollegeNameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
