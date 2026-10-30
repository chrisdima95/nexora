import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.model';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './checkout-success.component.html',
  styleUrls: ['./checkout-success.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutSuccessComponent implements OnInit {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly euroFormatter = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  });
  private readonly euroNumberFormatter = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  });

  isLoading = true;
  loadError = '';
  order: Order | null = null;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId || !/^[1-9]\d*$/.test(orderId)) {
      this.isLoading = false;
      this.loadError = "Non è stato possibile recuperare i dettagli dell'ordine.";
      return;
    }

    // JWTs live in browser storage. Render a neutral loading state on the server;
    // always let the authenticated API validate ownership, including after checkout.
    if (!this.isBrowser) {
      return;
    }

    this.orderService.getMyOrder(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.loadError = error.status === 401 || error.status === 403
          ? 'Sessione scaduta o non autorizzata. Effettua di nuovo il login.'
          : error.status === 404
            ? 'Ordine non trovato o non accessibile con questo account.'
            : "Non è stato possibile recuperare i dettagli dell'ordine.";
        this.cdr.markForCheck();
      }
    });
  }

  formatCurrency(value: number | string | null | undefined): string {
    const amount = this.toNumber(value);
    if (amount === null) {
      return '-';
    }

    const formatted = this.euroFormatter.format(amount);
    if (Math.abs(amount) >= 1000 && !formatted.includes('.')) {
      const sign = amount < 0 ? '-' : '';
      return `${sign}${this.euroNumberFormatter.format(Math.abs(amount))} €`;
    }

    return formatted;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const raw = value.trim().replace(/\s/g, '').replace('€', '');
    if (!raw) {
      return null;
    }

    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    let normalized = raw;

    if (lastComma !== -1 && lastDot !== -1) {
      // Se l'ultimo separatore è la virgola, assumiamo formato italiano (2.039,98).
      if (lastComma > lastDot) {
        normalized = raw.replace(/\./g, '').replace(',', '.');
      } else {
        // Altrimenti assumiamo formato inglese (2,039.98).
        normalized = raw.replace(/,/g, '');
      }
    } else if (lastComma !== -1) {
      normalized = raw.replace(',', '.');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
