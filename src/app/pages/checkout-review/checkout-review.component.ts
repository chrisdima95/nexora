import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartItem, CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { CreateOrderPayload } from '../../models/order.model';

type CheckoutMode = 'guest' | 'logged' | 'registered';

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

  mode: CheckoutMode = 'guest';
  userEmail = '';

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private orderService: OrderService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadCheckoutMode();
    this.loadUserInfo();

    this.cartService.cartItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.cartItems = items;
        this.totalPrice = this.cartService.getTotalPrice();
        this.cdr.markForCheck();
      });

    if (this.cartService.getCartItems().length === 0) {
      this.router.navigate(['/carrello']);
    }
  }

  confirmOrder(): void {
    if (this.cartItems.length === 0 || this.isSubmitting) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.isSubmitting = true;
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
      error: () => {
        this.isSubmitting = false;
        alert('Impossibile completare l\'ordine. Riprova.');
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
    if (this.mode === 'guest') {
      return "Stai completando l'acquisto come ospite.";
    }

    if (this.userEmail) {
      return `Ordine associato all'account ${this.userEmail}`;
    }

    return "Stai completando l'acquisto con il tuo account.";
  }

  private loadCheckoutMode(): void {
    const modeParam = this.route.snapshot.queryParamMap.get('mode');
    if (modeParam === 'logged' || modeParam === 'registered' || modeParam === 'guest') {
      this.mode = modeParam;
    } else if (this.authService.isAuthenticated()) {
      this.mode = 'logged';
    }

    // Manteniamo la logica mode per il flusso checkout senza esporre dettagli tecnici in UI.
  }

  private loadUserInfo(): void {
    this.authService.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.userEmail = user?.email ?? '';
      this.cdr.markForCheck();
    });
    this.authService.fetchMe().subscribe();
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
