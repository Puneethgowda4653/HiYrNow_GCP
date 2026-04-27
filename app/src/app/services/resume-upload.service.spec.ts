import { TestBed } from '@angular/core/testing';

import { ResumeUploadService } from './resume-upload.service';

describe('ResumeUploadService', () => {
  let service: ResumeUploadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResumeUploadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
