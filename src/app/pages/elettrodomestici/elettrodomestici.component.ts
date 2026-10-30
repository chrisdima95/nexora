import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiService, Product } from '../../services/api.service';
import { buildListErrorMessage } from '../../services/api-error';
import { productToCatalogCard } from '../../services/product-ui';
import { CardsComponent, Card } from '../../cards/cards.component';
import { CategoryProductFiltersComponent } from '../../shared/category-filters/category-product-filters.component';
import {
  BASE_CATALOG_SORT_OPTIONS,
  CatalogSortKey,
  isCatalogSortKey,
  sortProducts
} from '../../services/catalog-sorting';

@Component({
  selector: 'app-elettrodomestici',
  standalone: true,
  imports: [CardsComponent, CategoryProductFiltersComponent],
  templateUrl: './elettrodomestici.component.html',
  styleUrl: './elettrodomestici.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ElettrodomesticiComponent implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  cardsData: Card[] = [];
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  sortOptions = BASE_CATALOG_SORT_OPTIONS;
  selectedSort: CatalogSortKey = 'recent';
  loading = true;
  loadError = false;
  loadErrorMessage = '';

  ngOnInit(): void {
    this.loading = true;
    this.loadError = false;
    this.loadErrorMessage = '';
    this.api
      .getProductsByCategory('elettrodomestici', '-created_at')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (data: Product[]) => {
        this.allProducts = data;
        this.loadError = false;
        this.loading = false;
        this.onFiltered(data);
      },
      error: (err) => {
        console.error('Errore getProductsByCategory (elettrodomestici, browser):', err);
        this.allProducts = [];
        this.cardsData = [];
        this.loadError = true;
        this.loadErrorMessage = buildListErrorMessage('il catalogo elettrodomestici', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFiltered(products: Product[]): void {
    this.filteredProducts = products;
    const sorted = sortProducts(products, this.selectedSort);
    this.cardsData = sorted.map((p) =>
      productToCatalogCard(p, { categoryListingFrom: 'elettrodomestici' })
    );
    this.cdr.markForCheck();
  }

  onSortChange(value: string): void {
    if (!isCatalogSortKey(value)) {
      return;
    }
    this.selectedSort = value;
    this.onFiltered(this.filteredProducts);
  }
}