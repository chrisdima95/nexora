import { Component, OnInit, DestroyRef, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { RouterLink, Router } from '@angular/router';
import { CartService, CartItem } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-carrello',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './carrello.component.html',
  styleUrls: ['./carrello.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarrelloComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private readonly euroFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  });

  cartItems: CartItem[] = [];
  totalPrice: number = 0;
  isLoggedIn: boolean = false;

  constructor(
    public cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Controlla se l'utente è loggato
    this.isLoggedIn = this.authService.isAuthenticated();

    // Sottoscrivi agli aggiornamenti del carrello con gestione automatica unsubscribe
    this.cartService.cartItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(items => {
        this.cartItems = items;
        this.totalPrice = this.cartService.getTotalPrice();
        this.cdr.markForCheck();
      });
  }

  removeItem(itemId: string) {
    this.cartService.removeFromCart(itemId);
  }

  updateQuantity(itemId: string, quantity: number) {
    this.cartService.updateQuantity(itemId, quantity);
  }

  proceedToCheckout() {
    if (this.cartItems.length === 0) {
      alert('Il carrello è vuoto!');
      return;
    }

    if (this.isLoggedIn) {
      this.router.navigate(['/checkout/review'], {
        queryParams: { mode: 'logged' }
      });
      return;
    }

    // Utente non autenticato: mostra schermata checkout/accesso
    this.router.navigate(['/checkout']);
  }

  get checkoutButtonLabel(): string {
    return this.isLoggedIn ? 'Vai al riepilogo ordine' : 'Prosegui al checkout';
  }

  getItemSubtotal(itemId: string): number {
    return this.cartService.getItemSubtotal(itemId);
  }

  get totalItemsCount(): number {
    return this.cartItems.reduce((sum, item) => sum + this.toNumber(item.quantity), 0);
  }

  formatCurrency(value: number | string | null | undefined): string {
    const numericValue = this.toNumber(value);
    return this.euroFormatter.format(numericValue);
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
