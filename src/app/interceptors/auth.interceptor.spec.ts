import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('Order errors through JWT refresh', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let http: HttpClient;
  let requests: HttpTestingController;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'getAccessToken', 'getRefreshToken', 'refreshAccessToken', 'logout'
    ]);
    auth.getAccessToken.and.returnValue('test-access');
    auth.getRefreshToken.and.returnValue('test-refresh');
    auth.refreshAccessToken.and.returnValue(of('test-renewed-access'));
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: auth }
    ] });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('attaches the access token and propagates stock conflicts without refreshing or logging out', () => {
    let status = 0;
    http.post('/api/orders/', {}).subscribe({ error: (error) => status = error.status });
    const request = requests.expectOne('/api/orders/');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-access');
    request.flush({ detail: 'Stock insufficiente' }, { status: 409, statusText: 'Conflict' });
    expect(status).toBe(409);
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  for (const status of [400, 409, 503]) {
    it(`preserves authentication when an order returns ${status} after a successful refresh`, () => {
      let received = 0;
      http.post('/api/orders/', {}).subscribe({ error: (error) => received = error.status });
      requests.expectOne('/api/orders/').flush({}, { status: 401, statusText: 'Unauthorized' });
      const retry = requests.expectOne('/api/orders/');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer test-renewed-access');
      retry.flush({ detail: 'Ordine non completato' }, { status, statusText: 'Order error' });
      expect(received).toBe(status);
      expect(auth.logout).not.toHaveBeenCalled();
    });
  }

  it('retries an expired access token successfully', () => {
    let completed = false;
    http.post('/api/orders/', {}).subscribe(() => completed = true);
    requests.expectOne('/api/orders/').flush({}, { status: 401, statusText: 'Unauthorized' });
    requests.expectOne('/api/orders/').flush({ id: 1 }, { status: 201, statusText: 'Created' });
    expect(completed).toBeTrue();
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('logs out if refresh fails', () => {
    auth.refreshAccessToken.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    let status = 0;
    http.post('/api/orders/', {}).subscribe({ error: (error) => status = error.status });
    requests.expectOne('/api/orders/').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(status).toBe(401);
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it('logs out if the renewed access token is rejected', () => {
    http.post('/api/orders/', {}).subscribe({ error: () => {} });
    requests.expectOne('/api/orders/').flush({}, { status: 401, statusText: 'Unauthorized' });
    requests.expectOne('/api/orders/').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});
