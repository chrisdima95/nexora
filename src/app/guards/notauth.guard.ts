import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, Observable, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotauthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.authInitialized$.pipe(
      filter((initialized) => initialized),
      take(1),
      map(() => (this.authService.isAuthenticated() ? this.router.createUrlTree(['/account']) : true))
    );
  }
}

