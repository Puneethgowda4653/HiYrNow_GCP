import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { SummitService, SummitRegisterPayload } from './summit.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('SummitService', () => {
  let service: SummitService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SummitService],
    });

    service = TestBed.inject(SummitService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should form correct request payload and headers', () => {
    const payload: SummitRegisterPayload = {
      name: 'Test User',
      workEmail: 'test@example.com',
      phone: '1234567890',
      companyName: 'Company',
      campaign: 'campaign',
      utm_source: 'utm',
      referrer: 'ref',
    };

    service.register(payload).subscribe();

    const req = httpMock.expectOne((request) => request.url.includes('/api/summit/register'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    req.flush({ ok: true, signupToken: 'token' });
  });

  it('should retry once on network error (status 0)', () => {
    const payload: SummitRegisterPayload = {
      name: 'Test User',
      workEmail: 'test@example.com',
      phone: '1234567890',
    };

    let errorResponse: HttpErrorResponse | undefined;
    service.register(payload).subscribe({
      error: (err) => (errorResponse = err),
    });

    const first = httpMock.expectOne((request) =>
      request.url.includes('/api/summit/register')
    );
    first.flush('Network error', { status: 0, statusText: 'Error' });

    const second = httpMock.expectOne((request) =>
      request.url.includes('/api/summit/register')
    );
    second.flush('Still failing', { status: 0, statusText: 'Error' });

    expect(errorResponse).toBeTruthy();
    expect(errorResponse?.status).toBe(0);
  });
});


