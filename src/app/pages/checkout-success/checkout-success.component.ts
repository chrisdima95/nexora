import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
    private router: Router,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.isLoading = false;
      this.loadError = "Non è stato possibile recuperare i dettagli dell'ordine.";
      return;
    }

    const orderFromState = this.getOrderFromNavigationState(orderId);
    if (orderFromState) {
      this.order = orderFromState;
      this.isLoading = false;
      return;
    }

    this.orderService.getMyOrder(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = "Non è stato possibile recuperare i dettagli dell'ordine.";
      }
    });
  }

  private getOrderFromNavigationState(orderId: string): Order | null {
    const navigationState = this.router.getCurrentNavigation()?.extras.state as { order?: Order } | undefined;
    const historyState = history.state as { order?: Order } | undefined;
    const candidate = navigationState?.order ?? historyState?.order;

    if (!candidate) {
      return null;
    }

    return String(candidate.id) === orderId ? candidate : null;
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
