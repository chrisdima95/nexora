import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, finalize, map, of, switchMap, tap } from 'rxjs';

import { ApiService, Product, ProductQueryParams } from '../../services/api.service';
import { buildSearchErrorMessage } from '../../services/api-error';
import { excerptForProductCard, resolveProductImage } from '../../services/product-ui';
import { Card, CardsComponent } from '../../cards/cards.component';
import {
  BASE_CATALOG_SORT_OPTIONS,
  CatalogSortKey,
  isCatalogSortKey,
  sortProducts
} from '../../services/catalog-sorting';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CardsComponent, RouterLink],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  /** Parametro `q`: ricerca libera (navbar). */
  query = '';
  /** Parametro `brand`: filtro marchio (tile “Brand popolari”). */
  brandFilter = '';

  loading = false;
  errorMessage = '';
  cardsData: Card[] = [];
  allProducts: Product[] = [];
  sortOptions = BASE_CATALOG_SORT_OPTIONS;
  selectedSort: CatalogSortKey = 'recent';

  get pageHeading(): string {
    if (this.brandFilter && !this.query) {
      return 'Prodotti per marchio';
    }
    return 'Risultati ricerca';
  }

  get resultsContextLabel(): string {
    if (this.brandFilter && this.query) {
      return 'Marchio e ricerca';
    }
    if (this.brandFilter) {
      return 'Marchio';
    }
    return 'Ricerca prodotti';
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((pm) => ({
          q: (pm.get('q') ?? '').trim(),
          brand: (pm.get('brand') ?? '').trim()
        })),
        distinctUntilChanged((a, b) => a.q === b.q && a.brand === b.brand),
        tap(({ q, brand }) => {
          this.query = q;
          this.brandFilter = brand;
          this.errorMessage = '';
          this.cardsData = [];
          this.allProducts = [];
          this.loading = Boolean(q || brand);
          this.cdr.markForCheck();
        }),
        switchMap(({ q, brand }) => {
          if (!q && !brand) {
            return of([] as Product[]).pipe(finalize(() => this.finishSearch()));
          }

          const params: ProductQueryParams = {};
          if (brand) {
            params.brand = brand;
          }
          if (q) {
            params.search = q;
          }

          return this.api.getProducts(params).pipe(
            catchError((err) => {
              console.error('Errore getProducts (search results):', err);
              this.errorMessage = buildSearchErrorMessage(err);
              return of([] as Product[]);
            }),
            finalize(() => this.finishSearch())
          );
        })
      )
      .subscribe((products) => {
        this.allProducts = products;
        this.applySortedCards();

        this.finishSearch();
      });
  }

  onSortChange(value: string): void {
    if (!isCatalogSortKey(value)) {
      return;
    }
    this.selectedSort = value;
    this.applySortedCards();
    this.cdr.markForCheck();
  }

  private applySortedCards(): void {
    const sorted = sortProducts(this.allProducts, this.selectedSort);
    this.cardsData = sorted.map((p) => ({
      id: p.id.toString(),
      productId: p.id,
      link: ['/products', p.id.toString()],
      imgSrc: resolveProductImage(p),
      imgAlt: p.name,
      title: p.name,
      description: excerptForProductCard(p.description),
      detailsLinkText: 'Vedi dettagli',
      price: p.price.includes('€') ? p.price : `${p.price} €`,
      availabilityStatus: p.availability_status
    }));
  }

  private finishSearch(): void {
    this.loading = false;
    this.cdr.markForCheck();
  }
}
