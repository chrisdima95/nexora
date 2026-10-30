import {
  Component,
  DestroyRef,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  HostListener,
  ViewChild
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService, Product } from '../../services/api.service';
import { resolveProductImage } from '../../services/product-ui';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class NavbarComponent {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  /** Etichetta carrello con conteggio articoli (evita ridondanza con badge decorativo). */
  get cartAriaLabel(): string {
    if (this.cartCount <= 0) {
      return 'Carrello';
    }
    if (this.cartCount === 1) {
      return 'Carrello, 1 articolo';
    }
    return `Carrello, ${this.cartCount} articoli`;
  }
  private api = inject(ApiService);
  private hostElement = inject(ElementRef<HTMLElement>);
  private searchInput$ = new Subject<string>();

  @ViewChild('searchContainer') private searchContainerRef?: ElementRef<HTMLElement>;
  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  searchQuery = '';
  cartCount = 0;
  isCheckoutPage = false;
  /** True sulla pagina risultati ricerca: feedback visivo leggero sulla search bar. */
  isSearchRoute = false;
  isSearching = false;
  isSearchDropdownOpen = false;
  liveSearchError = '';
  liveResults: Product[] = [];
  searchDropdownLeft = 0;
  searchDropdownTop = 0;
  searchDropdownWidth = 0;
  highlightedResultIndex = -1;
  private readonly liveResultsLimit = 6;
  private readonly minSearchLength = 2;
  private readonly liveSearchDebounceMs = 180;
  private readonly searchCache = new Map<string, Product[]>();

  constructor(
    public loginService: AuthService,
    public cartService: CartService,
    private router: Router,
  ) {
    // Sottoscrivi agli aggiornamenti del carrello con gestione automatica unsubscribe
    // Usa startWith per catturare il valore iniziale
    this.cartService.cartItems$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.cartCount = this.cartService.getCartCount();
        this.cdr.markForCheck();
      });

    // Aggiorna anche dopo un breve delay per assicurarsi che il carrello sia stato caricato
    setTimeout(() => {
      this.cartCount = this.cartService.getCartCount();
      this.cdr.markForCheck();
    }, 0);

    // Controlla se siamo nella pagina checkout con gestione automatica unsubscribe
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.syncRouteFlags();
      this.syncSearchQueryFromUrl();
      this.cdr.markForCheck();
    });

    // Controllo iniziale
    this.syncRouteFlags();
    this.syncSearchQueryFromUrl();

    this.searchInput$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(this.liveSearchDebounceMs),
        map((query) => this.normalizeSearchQuery(query)),
        distinctUntilChanged(),
        tap(() => {
          this.isSearching = true;
          this.liveSearchError = '';
          this.isSearchDropdownOpen = true;
          this.highlightedResultIndex = -1;
          this.updateDropdownPosition();
          this.cdr.markForCheck();
        }),
        switchMap((query) => {
          const cachedResults = this.searchCache.get(query);
          if (cachedResults) {
            return of(cachedResults);
          }

          return this.api.searchProducts(query, { limit: this.liveResultsLimit }).pipe(
            map((products) => products.slice(0, this.liveResultsLimit)),
            tap((products) => this.storeSearchCache(query, products)),
            catchError((err) => {
              console.error('Errore searchProducts (navbar live search):', err);
              this.liveSearchError = 'Errore durante la ricerca live.';
              return of([] as Product[]);
            })
          );
        })
      )
      .subscribe((results) => {
        const currentQuery = this.normalizeSearchQuery(this.searchQuery);
        if (!currentQuery || currentQuery.length < this.minSearchLength) {
          this.resetLiveSearchState();
          return;
        }

        this.liveResults = results;
        this.isSearching = false;
        this.isSearchDropdownOpen = true;
        this.highlightedResultIndex = results.length > 0 ? 0 : -1;
        this.updateDropdownPosition();
        this.cdr.markForCheck();
      });
  }

  onSearch() {
    const normalizedQuery = this.searchQuery.trim();
    if (!normalizedQuery) {
      this.resetLiveSearchState();
      return;
    }

    this.closeSearchDropdown();
    this.router.navigate(['/search'], {
      queryParams: normalizedQuery ? { q: normalizedQuery } : {}
    });
  }

  onSearchInputChange(value: string): void {
    this.searchQuery = value;
    const normalizedQuery = this.normalizeSearchQuery(value);

    if (!normalizedQuery || normalizedQuery.length < this.minSearchLength) {
      this.resetLiveSearchState();
      return;
    }

    this.searchInput$.next(normalizedQuery);
  }

  onSearchInputFocus(): void {
    if (!this.searchQuery.trim()) {
      return;
    }

    if (this.isSearching || this.liveResults.length > 0 || this.liveSearchError) {
      this.isSearchDropdownOpen = true;
      if (this.highlightedResultIndex === -1 && this.liveResults.length > 0) {
        this.highlightedResultIndex = 0;
      }
      this.updateDropdownPosition();
      this.cdr.markForCheck();
    }
  }

  onSearchInputKeydown(event: KeyboardEvent): void {
    if (!this.isSearchDropdownOpen || this.liveResults.length === 0) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeSearchDropdown();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveHighlight(-1);
        break;
      case 'Enter': {
        if (this.highlightedResultIndex < 0 || this.highlightedResultIndex >= this.liveResults.length) {
          return;
        }
        event.preventDefault();
        this.onLiveResultSelect(this.liveResults[this.highlightedResultIndex]);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.closeSearchDropdown();
        break;
      default:
        break;
    }
  }

  onLiveResultSelect(product: Product): void {
    this.searchQuery = product.name;
    this.closeSearchDropdown();
    this.router.navigate(['/products', product.id]);
  }

  clearSearch(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.searchQuery = '';
    this.resetLiveSearchState();
    this.searchInputRef?.nativeElement.focus();
  }

  onResultHover(index: number): void {
    this.highlightedResultIndex = index;
    this.cdr.markForCheck();
  }

  formatPrice(price: string): string {
    return price.includes('€') ? price : `${price} €`;
  }

  getResultImage(product: Product): string {
    return resolveProductImage(product);
  }

  getHighlightedNameParts(productName: string): Array<{ text: string; match: boolean }> {
    const query = this.normalizeSearchQuery(this.searchQuery);
    if (!query) {
      return [{ text: productName, match: false }];
    }

    const nameLower = productName.toLowerCase();
    const queryLower = query.toLowerCase();
    const matchIndex = nameLower.indexOf(queryLower);

    if (matchIndex === -1) {
      return [{ text: productName, match: false }];
    }

    const before = productName.slice(0, matchIndex);
    const match = productName.slice(matchIndex, matchIndex + queryLower.length);
    const after = productName.slice(matchIndex + queryLower.length);

    return [
      { text: before, match: false },
      { text: match, match: true },
      { text: after, match: false }
    ].filter((part) => part.text.length > 0);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isSearchDropdownOpen) {
      return;
    }

    const target = event.target as Node | null;
    const searchContainer = this.searchContainerRef?.nativeElement ?? this.hostElement.nativeElement;

    if (target && searchContainer.contains(target)) {
      return;
    }

    this.closeSearchDropdown();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.closeSearchDropdown();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isSearchDropdownOpen) {
      this.updateDropdownPosition();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.isSearchDropdownOpen) {
      this.updateDropdownPosition();
    }
  }

  private syncRouteFlags(): void {
    const url = this.router.url;
    const path = (url.split('?')[0] ?? url).toLowerCase();
    this.isCheckoutPage = path === '/checkout';
    this.isSearchRoute = path === '/search';
  }

  private syncSearchQueryFromUrl(): void {
    const urlTree = this.router.parseUrl(this.router.url);
    const queryParam = urlTree.queryParams['q'];
    this.searchQuery = typeof queryParam === 'string' ? queryParam : '';
    this.resetLiveSearchState();
  }

  private closeSearchDropdown(): void {
    this.isSearchDropdownOpen = false;
    this.highlightedResultIndex = -1;
    this.cdr.markForCheck();
  }

  private resetLiveSearchState(): void {
    this.liveResults = [];
    this.liveSearchError = '';
    this.isSearchDropdownOpen = false;
    this.isSearching = false;
    this.highlightedResultIndex = -1;
    this.cdr.markForCheck();
  }

  private normalizeSearchQuery(value: string): string {
    return value.trim().toLowerCase();
  }

  private storeSearchCache(query: string, results: Product[]): void {
    if (this.searchCache.size >= 40) {
      const oldestKey = this.searchCache.keys().next().value;
      if (oldestKey) {
        this.searchCache.delete(oldestKey);
      }
    }
    this.searchCache.set(query, results);
  }

  private moveHighlight(direction: 1 | -1): void {
    if (this.liveResults.length === 0) {
      this.highlightedResultIndex = -1;
      this.cdr.markForCheck();
      return;
    }

    if (this.highlightedResultIndex === -1) {
      this.highlightedResultIndex = 0;
      this.cdr.markForCheck();
      return;
    }

    const nextIndex =
      (this.highlightedResultIndex + direction + this.liveResults.length) % this.liveResults.length;
    this.highlightedResultIndex = nextIndex;
    this.cdr.markForCheck();
  }

  private updateDropdownPosition(): void {
    const containerEl = this.searchContainerRef?.nativeElement;
    const inputWrapper = containerEl?.querySelector('.search-input-wrapper') as HTMLElement | null;

    if (!containerEl || !inputWrapper) {
      return;
    }

    const containerRect = containerEl.getBoundingClientRect();
    const inputRect = inputWrapper.getBoundingClientRect();
    const left = containerRect.left;
    const width = containerRect.width;
    const top = inputRect.bottom + 8;

    this.searchDropdownLeft = Math.max(8, Math.round(left));
    this.searchDropdownWidth = Math.max(260, Math.round(width));
    this.searchDropdownTop = Math.round(top);
  }
}
