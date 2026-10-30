import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { RegisterPayload } from '../../models/auth.model';


@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  isRegisterMode = false;
  errorMessage = '';

  constructor(
    public router: Router,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/account']);
    }
  }

  loginForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
    ]),
    password: new FormControl('', [
      Validators.required
    ]),
  });

  registerForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    first_name: new FormControl('', [Validators.required]),
    last_name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  login() {
    if (this.loginForm.valid) {
      const username = this.loginForm.value.username;
      const password = this.loginForm.value.password;

      if (!username || !password) {
        return;
      }
      this.errorMessage = '';
      this.authService.login(username, password).subscribe({
        next: () => {
          this.router.navigate(['/account']);
        },
        error: () => {
          this.errorMessage = 'Credenziali non valide.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  register(): void {
    if (!this.registerForm.valid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const payload: RegisterPayload = {
      username: this.registerForm.value.username ?? '',
      first_name: this.registerForm.value.first_name ?? '',
      last_name: this.registerForm.value.last_name ?? '',
      email: this.registerForm.value.email ?? '',
      password: this.registerForm.value.password ?? ''
    };
    this.errorMessage = '';
    this.authService.register(payload).subscribe({
      next: () => this.router.navigate(['/account']),
      error: () => {
        this.errorMessage = 'Registrazione non riuscita. Controlla i dati inseriti.';
        this.cdr.markForCheck();
      }
    });
  }
}