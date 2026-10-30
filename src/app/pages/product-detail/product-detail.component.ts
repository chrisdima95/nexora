import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, map, switchMap, tap } from 'rxjs';

import { ApiService, Product } from '../../services/api.service';
import { classifyApiError } from '../../services/api-error';
import { CartService } from '../../services/cart.service';
import { ProductDetailSectionsComponent } from './product-detail-sections.component';
import {
  buildProductGallery,
  descriptionToParagraphs,
  getCategoryLabel,
  getCategoryReturnLinkText,
  getCategoryRoute,
  productFallbackImageDataUrl,
  resolveProductImage,
  technicalSpecsToLines
} from '../../services/product-ui';
import { availabilityLabel, canAddToCart } from '../../services/product-availability';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink, ProductDetailSectionsComponent],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private cartService = inject(CartService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private latestRequestToken = 0;
  private currentRouteIdIsValid = false;

  product: Product | null = null;
  galleryImages: string[] = [];
  selectedImage = '';
  viewState: 'loading' | 'ready' | 'invalid-route' | 'not-found' | 'payload-invalid' | 'error' = 'loading';
  errorMessage = '';

  get isLoading(): boolean {
    return this.viewState === 'loading';
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(
        map((params) => (params.get('id') ?? '').trim()),
        distinctUntilChanged(),
        switchMap((rawId) => {
          const requestToken = ++this.latestRequestToken;
          const parsedId = this.parseRouteId(rawId);
          if (parsedId === null) {
            this.currentRouteIdIsValid = false;
            this.setInvalidRouteState(requestToken);
            return EMPTY;
          }

          this.currentRouteIdIsValid = true;
          this.setLoadingState(requestToken);

          return this.api.getProductById(parsedId).pipe(
            tap((product) => this.setProductState(product, requestToken)),
            catchError((err) => {
              console.error('Errore getProductById (product detail, browser):', err);
              this.setProductLoadErrorState(err, requestToken);
              return EMPTY;
            })
          );
        })
      )
      .subscribe();
  }

  addToCart(): void {
    if (!this.product || !canAddToCart(this.product)) {
      return;
    }

    this.cartService.addToCart({
      productId: this.product.id,
      title: this.product.name,
      unitPrice: this.parsePrice(this.product.price),
      imgSrc: resolveProductImage(this.product),
      imgAlt: this.product.name
    });
  }

  formatPrice(price: string): string {
    return price.includes('EUR') || price.includes('€') ? price.replace('EUR', '€').trim() : `${price} €`;
  }

  isOnSale(p: Product): boolean {
    const orig = p.original_price?.trim();
    if (!orig) {
      return false;
    }
    const o = parseFloat(orig);
    const current = parseFloat(p.price);
    return Number.isFinite(o) && Number.isFinite(current) && o > current;
  }

  getAvailabilityLabel(p: Product): string {
    return availabilityLabel(p.availability_status);
  }

  canAddProductToCart(p: Product): boolean {
    return canAddToCart(p);
  }

  onHeroImageError(): void {
    if (!this.product) {
      return;
    }
    const fallback = productFallbackImageDataUrl(this.product.name, this.product.category);
    if (this.selectedImage === fallback) {
      return;
    }
    this.selectedImage = fallback;
    this.galleryImages = [fallback];
    this.cdr.markForCheck();
  }

  getCategoryLabel(category?: string): string {
    return getCategoryLabel(category);
  }

  getCategoryReturnLinkText(category?: string): string {
    return getCategoryReturnLinkText(category);
  }

  getCategoryLink(category?: string): string[] {
    return getCategoryRoute(category);
  }

  getDescriptionParagraphs(description?: string): string[] {
    return descriptionToParagraphs(description);
  }

  getTechnicalSpecs(specs?: string): string[] {
    return technicalSpecsToLines(specs);
  }

  selectImage(image: string): void {
    this.selectedImage = image;
  }

  private parseRouteId(rawId: string): number | null {
    // Route valida solo se contiene esclusivamente cifre e rappresenta un intero > 0.
    if (!/^\d+$/.test(rawId)) {
      return null;
    }

    const id = Number(rawId);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private parsePrice(value: string): number {
    const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private isCurrentRequest(requestToken: number): boolean {
    return requestToken === this.latestRequestToken;
  }

  private setLoadingState(requestToken: number): void {
    if (!this.isCurrentRequest(requestToken)) {
      return;
    }
    this.viewState = 'loading';
    this.errorMessage = '';
    this.product = null;
    this.galleryImages = [];
    this.selectedImage = '';
    this.cdr.markForCheck();
  }

  private setInvalidRouteState(requestToken: number): void {
    if (!this.isCurrentRequest(requestToken)) {
      return;
    }
    this.product = null;
    this.galleryImages = [];
    this.selectedImage = '';
    this.viewState = 'invalid-route';
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  private setProductState(product: Product, requestToken: number): void {
    if (!this.isCurrentRequest(requestToken)) {
      return;
    }
    this.product = product;
    this.galleryImages = buildProductGallery(product);
    this.selectedImage = this.galleryImages[0] || resolveProductImage(product);
    this.viewState = 'ready';
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  private setProductLoadErrorState(error: unknown, requestToken: number): void {
    if (!this.isCurrentRequest(requestToken)) {
      return;
    }
    if (!this.currentRouteIdIsValid) {
      this.setInvalidRouteState(requestToken);
      return;
    }
    this.product = null;
    this.galleryImages = [];
    this.selectedImage = '';
    const apiError = classifyApiError(error);

    if (apiError.kind === 'not-found') {
      this.viewState = 'not-found';
      this.errorMessage = '';
    } else if (apiError.kind === 'payload-invalid') {
      this.viewState = 'payload-invalid';
      this.errorMessage = '';
    } else if (apiError.kind === 'network') {
      this.viewState = 'error';
      this.errorMessage = 'Il servizio non e raggiungibile. Impossibile caricare il prodotto.';
    } else if (apiError.kind === 'timeout') {
      this.viewState = 'error';
      this.errorMessage = 'Il caricamento del prodotto richiede piu tempo del previsto. Riprova.';
    } else if (apiError.kind === 'server') {
      this.viewState = 'error';
      this.errorMessage = 'Il server ha restituito un errore durante il caricamento del prodotto.';
    } else {
      this.viewState = 'error';
      this.errorMessage = 'Impossibile caricare i dettagli del prodotto.';
    }

    this.cdr.markForCheck();
  }
}
