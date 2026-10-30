import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';
import { User } from '../../models/auth.model';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountComponent implements OnInit {
  user: User | null = null;
  orders: Order[] = [];
  isLoadingOrders = true;
  ordersError = '';

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.fetchMe().subscribe({
      next: (user) => {
        this.user = user;
        this.cdr.markForCheck();
      },
      error: () => {
        this.user = null;
        this.cdr.markForCheck();
      }
    });

    this.loadOrders();
  }

  retryLoadOrders(): void {
    this.loadOrders();
  }

  formatCurrency(value: string): string {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return value;
    }
    return `${numeric.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} €`;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  totalItems(order: Order): number {
    return (order.items ?? []).reduce((total, item) => total + item.quantity, 0);
  }

  mapOrderStatus(status: string): string {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'Confermato';
      case 'pending':
        return 'In elaborazione';
      case 'cancelled':
        return 'Annullato';
      default:
        return status || '-';
    }
  }

  orderStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'status-badge status-badge--confirmed';
      case 'pending':
        return 'status-badge status-badge--pending';
      case 'cancelled':
        return 'status-badge status-badge--cancelled';
      default:
        return 'status-badge';
    }
  }

  itemSubtotal(item: Order['items'][number]): string {
    const subtotal = Number(item.subtotal);
    if (Number.isFinite(subtotal)) {
      return this.formatCurrency(item.subtotal);
    }

    const unitPrice = Number(item.unit_price);
    if (Number.isFinite(unitPrice)) {
      return this.formatCurrency((unitPrice * item.quantity).toFixed(2));
    }

    return '-';
  }

  logout(): void {
    this.authService.logout();
    this.user = null;
  }

  private loadOrders(): void {
    this.isLoadingOrders = true;
    this.ordersError = '';
    this.cdr.markForCheck();

    this.orderService
      .listMyOrders()
      .pipe(
        finalize(() => {
          this.isLoadingOrders = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (orders) => {
          const safeOrders = Array.isArray(orders) ? orders : [];
          this.orders = safeOrders.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        },
        error: (error: HttpErrorResponse) => {
          this.orders = [];
          this.ordersError =
            error.status === 401 || error.status === 403
              ? 'Sessione scaduta o non autorizzata. Effettua di nuovo il login.'
              : 'Non è stato possibile caricare i tuoi ordini.';
        }
      });
  }
}
