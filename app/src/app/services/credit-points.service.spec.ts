import { TestBed } from '@angular/core/testing';

import { CreditPointsService } from './credit-points.service';

describe('CreditPointsService', () => {
  let service: CreditPointsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreditPointsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
