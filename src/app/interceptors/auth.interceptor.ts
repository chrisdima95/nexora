import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

const RETRY_REQUEST = new HttpContextToken<boolean>(() => false);

const AUTH_EXCLUDED_PATHS = ['/api/auth/login/', '/api/auth/register/', '/api/auth/token/refresh/'];

const isApiRequest = (url: string): boolean => url.includes('/api/');
const isExcludedAuthEndpoint = (url: string): boolean =>
  AUTH_EXCLUDED_PATHS.some((path) => url.includes(path));

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const isExcluded = isExcludedAuthEndpoint(req.url);
  const accessToken = authService.getAccessToken();

  const requestWithAuth =
    !isExcluded && accessToken
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`
          }
        })
      : req;

  return next(requestWithAuth).pipe(
    catchError((error) => {
      const alreadyRetried = requestWithAuth.context.get(RETRY_REQUEST);
      const canAttemptRefresh = !isExcluded && !alreadyRetried && error?.status === 401;

      if (!canAttemptRefresh) {
        return throwError(() => error);
      }

      if (!authService.getRefreshToken()) {
        authService.logout();
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap((newAccessToken) => {
          const retryRequest = requestWithAuth.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`
            },
            context: requestWithAuth.context.set(RETRY_REQUEST, true)
          });
          return next(retryRequest);
        }),
        catchError((refreshError) => {
          authService.logout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
