import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Order } from '../../models/order.model';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { CheckoutReviewComponent } from './checkout-review.component';

describe('Authenticated checkout review', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let orders: jasmine.SpyObj<OrderService>;
  let cart: CartService;
  let navigate: jasmine.Spy;
  const user = { id: 1, username: 'demo', email: 'demo@example.test', first_name: '', last_name: '' };
  const order: Order = {
    id: 4, order_number: 'ORD-TEST', status: 'confirmed', total_amount: '25.00',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', items: []
  };

  beforeEach(async () => {
    localStorage.removeItem('nexoraCart');
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated', 'fetchMe'], {
      currentUser$: of(user)
    });
    auth.isAuthenticated.and.returnValue(true);
    auth.fetchMe.and.returnValue(of(user));
    orders = jasmine.createSpyObj<OrderService>('OrderService', ['createOrder']);
    orders.createOrder.and.returnValue(of(order));
    await TestBed.configureTestingModule({
      imports: [CheckoutReviewComponent],
      providers: [
        provideRouter([]), { provide: AuthService, useValue: auth },
        { provide: OrderService, useValue: orders }
      ]
    }).compileComponents();
    cart = TestBed.inject(CartService);
    cart.addToCart({ productId: 1, title: 'Demo', unitPrice: 12.5, imgSrc: '/demo.jpg', imgAlt: 'Demo' });
    cart.updateQuantity('product-1', 2);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => localStorage.removeItem('nexoraCart'));

  it('redirects anonymous access to checkout login without fetching a profile or losing the cart', () => {
    auth.isAuthenticated.and.returnValue(false);
    TestBed.createComponent(CheckoutReviewComponent).detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/checkout']);
    expect(auth.fetchMe).not.toHaveBeenCalled();
    expect(cart.getCartCount()).toBe(2);
  });

  it('redirects an empty cart before loading the profile', () => {
    cart.clearCart();
    TestBed.createComponent(CheckoutReviewComponent).detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/carrello']);
    expect(auth.fetchMe).not.toHaveBeenCalled();
  });

  it('submits only product IDs and quantities and clears the cart after success', () => {
    const fixture = TestBed.createComponent(CheckoutReviewComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toMatch(/ospite/i);
    fixture.componentInstance.confirmOrder();
    expect(orders.createOrder).toHaveBeenCalledWith({ items: [{ product_id: 1, quantity: 2 }] });
    expect(cart.getCartCount()).toBe(0);
    expect(navigate).toHaveBeenCalledWith(['/checkout/success', 4], { state: { order } });
  });

  it('displays a stock conflict and keeps the cart available for editing', () => {
    orders.createOrder.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { detail: 'Disponibilità insufficiente: disponibili 1.' }
    })));
    const fixture = TestBed.createComponent(CheckoutReviewComponent);
    fixture.detectChanges();
    fixture.componentInstance.confirmOrder();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('disponibili 1');
    expect(fixture.componentInstance.isSubmitting).toBeFalse();
    expect(cart.getCartCount()).toBe(2);
    expect(navigate).not.toHaveBeenCalled();
    cart.updateQuantity('product-1', 1);
    orders.createOrder.and.returnValue(of(order));
    fixture.componentInstance.confirmOrder();
    expect(orders.createOrder).toHaveBeenCalledWith({ items: [{ product_id: 1, quantity: 1 }] });
  });

  it('displays a temporary database contention message without losing the cart', () => {
    orders.createOrder.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 503, error: { detail: 'Il servizio ordini è occupato. Riprova tra pochi secondi.' }
    })));
    const fixture = TestBed.createComponent(CheckoutReviewComponent);
    fixture.detectChanges();
    fixture.componentInstance.confirmOrder();
    expect(fixture.componentInstance.errorMessage).toContain('occupato');
    expect(cart.getCartCount()).toBe(2);
  });

  it('prevents repeated clicks while an order is being submitted', () => {
    orders.createOrder.and.returnValue(new Subject<Order>());
    const fixture = TestBed.createComponent(CheckoutReviewComponent);
    fixture.detectChanges();
    fixture.componentInstance.confirmOrder();
    fixture.componentInstance.confirmOrder();
    expect(orders.createOrder).toHaveBeenCalledTimes(1);
    expect(cart.getCartCount()).toBe(2);
  });

  it('returns to checkout if the session expires before confirmation', () => {
    const fixture = TestBed.createComponent(CheckoutReviewComponent);
    fixture.detectChanges();
    auth.isAuthenticated.and.returnValue(false);
    fixture.componentInstance.confirmOrder();
    expect(navigate).toHaveBeenCalledWith(['/checkout']);
    expect(orders.createOrder).not.toHaveBeenCalled();
    expect(cart.getCartCount()).toBe(2);
  });

  it('returns to checkout when the backend rejects the session', () => {
    orders.createOrder.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const fixture = TestBed.createComponent(CheckoutReviewComponent);
    fixture.detectChanges();
    fixture.componentInstance.confirmOrder();
    expect(navigate).toHaveBeenCalledWith(['/checkout']);
    expect(cart.getCartCount()).toBe(2);
  });
});
