import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { CheckoutComponent } from './checkout.component';

describe('Checkout account access', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let cart: CartService;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    localStorage.removeItem('nexoraCart');
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated', 'login', 'register']);
    auth.isAuthenticated.and.returnValue(false);
    auth.login.and.returnValue(of({ id: 1, username: 'demo', email: '', first_name: '', last_name: '' }));
    auth.register.and.returnValue(of({ id: 1, username: 'demo', email: '', first_name: '', last_name: '' }));
    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
    }).compileComponents();
    cart = TestBed.inject(CartService);
    cart.addToCart({ productId: 1, title: 'Demo', unitPrice: 12.5, imgSrc: '/demo.jpg', imgAlt: 'Demo' });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => localStorage.removeItem('nexoraCart'));

  it('offers login and registration without a guest purchase option', () => {
    const fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("Accedi al tuo account per confermare l'ordine.");
    expect(text).not.toMatch(/ospite|senza registrazione/i);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('continues to review after login and preserves the cart', () => {
    const fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
    fixture.componentInstance.loginForm.setValue({ username: 'demo', password: 'test-password' });
    fixture.componentInstance.login();
    expect(auth.login).toHaveBeenCalledWith('demo', 'test-password');
    expect(navigate).toHaveBeenCalledWith(['/checkout/review']);
    expect(cart.getCartCount()).toBe(1);
  });

  it('continues to review after registration and preserves the cart', () => {
    const fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.showRegisterForm = true;
    component.registerForm.setValue({
      username: 'demo', first_name: 'Demo', last_name: 'Test', email: 'demo@example.test',
      password: 'test-password', confirmPassword: 'test-password'
    });
    component.register();
    expect(auth.register).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/checkout/review']);
    expect(cart.getCartCount()).toBe(1);
  });

  it('sends authenticated customers directly to review', () => {
    auth.isAuthenticated.and.returnValue(true);
    TestBed.createComponent(CheckoutComponent).detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/checkout/review']);
  });

  it('returns an empty cart to the cart page', () => {
    cart.clearCart();
    TestBed.createComponent(CheckoutComponent).detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/carrello']);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('requires at least eight characters before submitting registration', () => {
    const component = TestBed.createComponent(CheckoutComponent).componentInstance;
    component.registerForm.controls.password.setValue('short7');
    expect(component.registerForm.controls.password.hasError('minlength')).toBeTrue();
  });
});
