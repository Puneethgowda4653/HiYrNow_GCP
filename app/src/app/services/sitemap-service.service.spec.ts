import { TestBed } from '@angular/core/testing';

import { SitemapServiceService } from './sitemap-service.service';

describe('SitemapServiceService', () => {
  let service: SitemapServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SitemapServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
