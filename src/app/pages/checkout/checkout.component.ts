import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { RegisterPayload } from '../../models/auth.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent implements OnInit {
  isLoggedIn = false;
  showPassword: boolean = false;
  showRegisterPassword: boolean = false;
  showRegisterConfirmPassword: boolean = false;
  showRegisterForm: boolean = false;

  loginForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  });

  registerForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    first_name: new FormControl('', [Validators.required]),
    last_name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
    confirmPassword: new FormControl('', [Validators.required])
  });

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isAuthenticated();

    if (this.cartService.getCartItems().length === 0) {
      this.router.navigate(['/carrello']);
      return;
    }

    if (this.isLoggedIn) {
      this.proceedToReview();
    }
  }

  ngOnDestroy() {
    // Cleanup se necessario
  }

  get loginEmail() {
    return this.loginForm.get('username');
  }

  get loginPassword() {
    return this.loginForm.get('password');
  }

  get registerEmail() {
    return this.registerForm.get('email');
  }

  get registerPassword() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  login() {
    if (this.loginForm.valid) {
      const username = this.loginForm.value.username;
      const password = this.loginForm.value.password;

      if (username && password) {
        this.authService.login(username, password).subscribe({
          next: () => {
            this.isLoggedIn = true;
            this.cdr.markForCheck();
            this.proceedToReview();
          },
          error: () => alert('Credenziali non valide')
        });
      }
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  register() {
    // Se il form non è ancora visibile, mostralo
    if (!this.showRegisterForm) {
      this.showRegisterForm = true;
      this.cdr.markForCheck();
      return;
    }

    // Se il form è visibile, procedi con la registrazione
    if (this.registerForm.valid) {
      const email = this.registerForm.value.email;
      const password = this.registerForm.value.password;
      const confirmPassword = this.registerForm.value.confirmPassword;

      if (password !== confirmPassword) {
        alert('Le password non corrispondono');
        return;
      }

      const username = this.registerForm.value.username;
      const firstName = this.registerForm.value.first_name;
      const lastName = this.registerForm.value.last_name;
      if (email && password && username && firstName && lastName) {
        const payload: RegisterPayload = {
          username,
          first_name: firstName,
          last_name: lastName,
          email,
          password
        };
        this.authService.register(payload).subscribe({
          next: () => {
            this.isLoggedIn = true;
            this.cdr.markForCheck();
            this.proceedToReview();
          },
          error: () => alert('Errore durante la registrazione')
        });
      }
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  private proceedToReview() {
    this.router.navigate(['/checkout/review']);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    this.cdr.markForCheck();
  }

  toggleRegisterPasswordVisibility() {
    this.showRegisterPassword = !this.showRegisterPassword;
    this.cdr.markForCheck();
  }

  toggleRegisterConfirmPasswordVisibility() {
    this.showRegisterConfirmPassword = !this.showRegisterConfirmPassword;
    this.cdr.markForCheck();
  }

  getLoginEmailErrorMessage(): string {
    if (this.loginEmail?.hasError('required')) {
      return 'Lo username è obbligatorio';
    }
    return '';
  }

  getRegisterEmailErrorMessage(): string {
    if (this.registerEmail?.hasError('required')) {
      return 'L\'email è obbligatoria';
    }
    if (this.registerEmail?.hasError('email')) {
      return 'Inserisci un\'email valida';
    }
    return '';
  }

  getRegisterPasswordErrorMessage(): string {
    if (this.registerPassword?.hasError('required')) {
      return 'La password è obbligatoria';
    }
    if (this.registerPassword?.hasError('minlength')) {
      return 'La password deve essere di almeno 8 caratteri';
    }
    return '';
  }
}
