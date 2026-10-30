import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartItem, CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { CreateOrderPayload } from '../../models/order.model';

@Component({
  selector: 'app-checkout-review',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './checkout-review.component.html',
  styleUrls: ['./checkout-review.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutReviewComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private readonly euroFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  });

  cartItems: CartItem[] = [];
  totalPrice = 0;
  isSubmitting = false;
  errorMessage = '';

  userEmail = '';

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.cartService.getCartItems().length === 0) {
      this.router.navigate(['/carrello']);
      return;
    }
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/checkout']);
      return;
    }
    this.loadUserInfo();

    this.cartService.cartItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.cartItems = items;
        this.totalPrice = this.cartService.getTotalPrice();
        this.cdr.markForCheck();
      });

  }

  confirmOrder(): void {
    if (this.cartItems.length === 0 || this.isSubmitting) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/checkout']);
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    const payload: CreateOrderPayload = {
      items: this.cartItems.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity
      }))
    };

    this.orderService.createOrder(payload).subscribe({
      next: (order) => {
        this.cartService.clearCart();
        this.router.navigate(['/checkout/success', order.id], {
          state: { order }
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        if (error.status === 401 || error.status === 403) {
          this.router.navigate(['/checkout']);
          return;
        }
        const detail = [400, 409, 503].includes(error.status)
          ? error.error?.detail ?? error.error?.items
          : null;
        this.errorMessage = typeof detail === 'string'
          ? detail
          : Array.isArray(detail) && detail.every((message) => typeof message === 'string')
            ? detail.join(' ')
            : "Impossibile completare l'ordine. Riprova.";
        this.cdr.markForCheck();
      }
    });
  }

  getItemSubtotal(itemId: string): number {
    return this.cartService.getItemSubtotal(itemId);
  }

  formatCurrency(value: number | string | null | undefined): string {
    return this.euroFormatter.format(this.toNumber(value));
  }

  get accountMessage(): string {
    if (this.userEmail) {
      return `Ordine associato all'account ${this.userEmail}`;
    }

    return "Stai completando l'acquisto con il tuo account.";
  }

  private loadUserInfo(): void {
    this.authService.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.userEmail = user?.email ?? '';
      this.cdr.markForCheck();
    });
    this.authService.fetchMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: (error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          this.router.navigate(['/checkout']);
        }
      }
    });
  }

  private toNumber(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const normalized = Number(value.replace(',', '.').trim());
      return Number.isFinite(normalized) ? normalized : 0;
    }

    return 0;
  }
}
