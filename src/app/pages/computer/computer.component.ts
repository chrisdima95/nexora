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
  selector: 'app-computer',
  standalone: true,
  imports: [CardsComponent, CategoryProductFiltersComponent],
  templateUrl: './computer.component.html',
  styleUrl: './computer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComputerComponent implements OnInit {
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
      .getProductsByCategory('computer', '-created_at')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (data: Product[]) => {
        this.allProducts = data;
        this.loadError = false;
        this.loading = false;
        // Stessa pipeline dei filtri con selezione vuota: non dipendere solo dall’emissione del figlio.
        this.onFiltered(data);
      },
      error: (err) => {
        console.error('Errore getProductsByCategory (computer, browser):', err);
        this.allProducts = [];
        this.cardsData = [];
        this.loadError = true;
        this.loadErrorMessage = buildListErrorMessage('il catalogo computer', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFiltered(products: Product[]): void {
    this.filteredProducts = products;
    const sorted = sortProducts(products, this.selectedSort);
    this.cardsData = sorted.map((p) =>
      productToCatalogCard(p, { categoryListingFrom: 'computer' })
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
