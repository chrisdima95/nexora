import { Injectable } from '@angular/core';

import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class LoginService {
  constructor(private authService: AuthService) {}

  isUserLogged(): boolean {
    return this.authService.isAuthenticated();
  }
}

