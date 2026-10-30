import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { ApiService, Product } from '../../services/api.service';
import { buildListErrorMessage } from '../../services/api-error';
import {
  catalogListingCategorySlugFromProduct,
  productToCatalogCard
} from '../../services/product-ui';
import { CardsComponent, Card } from '../../cards/cards.component';
import {
  CatalogSortKey,
  OFFERS_SORT_OPTIONS,
  isCatalogSortKey,
  sortProducts
} from '../../services/catalog-sorting';

/** Costante dedicata: evita falsi positivi del language service ("All imports are unused" su `imports: [...]`). */
const SCONTI_STANDALONE_IMPORTS = [CardsComponent, RouterLink] as const;

@Component({
  selector: 'app-sconti',
  standalone: true,
  imports: [...SCONTI_STANDALONE_IMPORTS],
  templateUrl: './sconti.component.html',
  styleUrls: ['./sconti.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScontiComponent implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  cardsData: Card[] = [];
  allProducts: Product[] = [];
  sortOptions = OFFERS_SORT_OPTIONS;
  selectedSort: CatalogSortKey = 'discount-desc';
  loading = true;
  loadError = false;
  loadErrorMessage = '';

  ngOnInit(): void {
    this.api
      .getProducts({ on_sale: true, purchasable: true, limit: 20 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (data: Product[]) => {
        this.allProducts = data;
        this.applyCardsFromProducts(data);
        this.loading = false;
        this.loadError = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Errore caricamento offerte:', err);
        this.cardsData = [];
        this.allProducts = [];
        this.loading = false;
        this.loadError = true;
        this.loadErrorMessage = buildListErrorMessage('la pagina offerte', err);
        this.cdr.markForCheck();
      }
    });
  }

  onSortChange(value: string): void {
    if (!isCatalogSortKey(value)) {
      return;
    }
    this.selectedSort = value;
    this.applyCardsFromProducts(this.allProducts);
    this.cdr.markForCheck();
  }

  private applyCardsFromProducts(products: Product[]): void {
    const sorted = sortProducts(products, this.selectedSort);
    this.cardsData = sorted.map((p) =>
      productToCatalogCard(p, {
        idPrefix: 'offer-',
        categoryListingFrom: catalogListingCategorySlugFromProduct(p.category)
      })
    );
  }
}
