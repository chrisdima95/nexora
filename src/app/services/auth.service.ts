import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  take,
  tap,
  throwError
} from 'rxjs';

import { AuthResponse, RegisterPayload, User } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'nexoraAccessToken';
  private static readonly REFRESH_TOKEN_KEY = 'nexoraRefreshToken';

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private apiBaseUrl = isPlatformServer(this.platformId) ? 'http://127.0.0.1:8000/api' : '/api';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private authInitializedSubject = new BehaviorSubject<boolean>(false);
  private refreshInProgress = false;
  private refreshAccessTokenSubject = new BehaviorSubject<string | null>(null);
  private authInitialization$: Observable<void> | null = null;

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly authInitialized$ = this.authInitializedSubject.asObservable();

  constructor() {}

  login(username: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiBaseUrl}/auth/login/`, { username, password }).pipe(
      tap((tokens) => this.saveTokens(tokens)),
      switchMap(() => this.fetchMe()),
      tap(() => this.authInitializedSubject.next(true))
    );
  }

  register(payload: RegisterPayload): Observable<User> {
    return this.http.post<User>(`${this.apiBaseUrl}/auth/register/`, payload).pipe(
      switchMap(() => this.login(payload.username, payload.password))
    );
  }

  fetchMe(): Observable<User> {
    return this.http.get<User>(`${this.apiBaseUrl}/auth/me/`).pipe(
      tap((user) => {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      })
    );
  }

  logout(): void {
    this.clearTokens();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.authInitializedSubject.next(true);
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isAuthInitialized(): boolean {
    return this.authInitializedSubject.value;
  }

  getAccessToken(): string | null {
    return this.readStorage(AuthService.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.readStorage(AuthService.REFRESH_TOKEN_KEY);
  }

  refreshAccessToken(): Observable<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    if (this.refreshInProgress) {
      return this.refreshAccessTokenSubject.pipe(
        filter((token): token is string => !!token),
        take(1)
      );
    }

    this.refreshInProgress = true;
    this.refreshAccessTokenSubject.next(null);

    return this.http
      .post<{ access: string }>(`${this.apiBaseUrl}/auth/token/refresh/`, { refresh: refreshToken })
      .pipe(
        map((response) => response.access),
        tap((newAccessToken) => {
          this.saveAccessToken(newAccessToken);
          this.refreshAccessTokenSubject.next(newAccessToken);
        }),
        finalize(() => {
          this.refreshInProgress = false;
        })
      );
  }

  private saveTokens(tokens: AuthResponse): void {
    this.writeStorage(AuthService.ACCESS_TOKEN_KEY, tokens.access);
    this.writeStorage(AuthService.REFRESH_TOKEN_KEY, tokens.refresh);
  }

  private saveAccessToken(token: string): void {
    this.writeStorage(AuthService.ACCESS_TOKEN_KEY, token);
  }

  initializeAuthState(): Observable<void> {
    if (this.authInitializedSubject.value) {
      return of(void 0);
    }

    if (this.authInitialization$) {
      return this.authInitialization$;
    }

    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (!accessToken && !refreshToken) {
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      this.authInitializedSubject.next(true);
      return of(void 0);
    }

    this.authInitialization$ = this.fetchMe()
      .pipe(
        catchError(() => {
          if (!refreshToken) {
            return throwError(() => new Error('Sessione non valida'));
          }
          return this.refreshAccessToken().pipe(switchMap(() => this.fetchMe()));
        }),
        tap(() => {
          this.authInitializedSubject.next(true);
        }),
        map(() => void 0),
        catchError(() => {
          this.clearTokens();
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          this.authInitializedSubject.next(true);
          return of(void 0);
        }),
        finalize(() => {
          this.authInitialization$ = null;
        }),
        shareReplay(1)
      );

    return this.authInitialization$;
  }

  private clearTokens(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(AuthService.ACCESS_TOKEN_KEY);
    localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
    localStorage.removeItem('myAppLoggedUser');
  }

  private readStorage(key: string): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(key);
  }

  private writeStorage(key: string, value: string): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(key, value);
  }
}
