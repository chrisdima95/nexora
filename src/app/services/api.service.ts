import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, TimeoutError, catchError, map, throwError, timeout } from 'rxjs';

export interface PingResponse {
  status: string;
}

export interface Product {
  id: number;
  name: string;
  /** Marchio normalizzato (filtro API `brand`, separato da `search`). */
  brand: string;
  price: string;       // Decimal DRF spesso arriva come stringa
  /** Prezzo di listino se in offerta (maggiore di price) */
  original_price?: string | null;
  /** Percentuale sconto calcolata lato API se original_price > price */
  discount_percentage?: number | null;
  image_url: string;
  category: string;
  description: string;
  technical_specs: string;
  /** True se il prodotto è selezionato per la homepage (backend). */
  is_featured: boolean;
  created_at?: string;
  stock_quantity: number;
  availability_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface ProductQueryParams {
  search?: string;
  /** Filtro marchio esatto (case-insensitive lato API). */
  brand?: string;
  category?: string;
  /** Se true, richiede solo prodotti con original_price > price */
  on_sale?: boolean;
  /** Se true, richiede solo prodotti con is_featured (homepage). */
  featured?: boolean;
  /**
   * Se true, esclude i prodotti con is_featured (utile in home: offerte senza duplicare “in evidenza”).
   * La pagina /offerte non imposta questo parametro.
   */
  exclude_featured?: boolean;
  /**
   * Se true, esclude prodotti in promozione (original_price > price), es. home: novità vs offerte.
   */
  exclude_on_sale?: boolean;
  /**
   * Se true, ordina per data di inserimento decrescente (ultimi arrivi / novità).
   */
  recent?: boolean;
  /**
   * Se true, richiede solo prodotti acquistabili (stock_quantity > 0), escludendo gli esauriti.
   */
  purchasable?: boolean;
  min_price?: number;
  max_price?: number;
  ordering?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private static readonly REQUEST_TIMEOUT_MS = 12000;
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiBaseUrl = isPlatformServer(this.platformId) ? 'http://127.0.0.1:8000/api' : '/api';

  // ✅ health check backend
  ping(): Observable<PingResponse> {
    return this.withRequestTimeout(this.http.get<PingResponse>(this.apiUrl('/ping/')));
  }

  // ✅ lista prodotti (filtri opzionali)
  getProducts(params?: ProductQueryParams): Observable<Product[]> {
    return this.withRequestTimeout(
      this.http.get<Array<Partial<Product>> | { results?: Array<Partial<Product>> }>(this.apiUrl('/products/'), {
        params: this.buildQueryParams(params)
      })
    )
      .pipe(map((response) => this.normalizeProductListResponse(response)));
  }

  // ✅ solo prodotti di una categoria
  getProductsByCategory(category: string, ordering?: string): Observable<Product[]> {
    return this.getProducts({ category, ordering });
  }

  // ✅ ricerca prodotti globale (backend-driven)
  searchProducts(search: string, options?: Omit<ProductQueryParams, 'search'>): Observable<Product[]> {
    return this.getProducts({
      ...options,
      search
    });
  }

  getProductById(id: number | string): Observable<Product> {
    return this.withRequestTimeout(
      this.http.get<Partial<Product>>(this.apiUrl(`/products/${id}/`))
    )
      .pipe(
        map((product) => {
          const normalized = this.normalizeProduct(product);
          if (!normalized) {
            throw new Error('Invalid product payload');
          }
          return normalized;
        })
      );
  }

  private apiUrl(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }

  private normalizeProductListResponse(
    response: Array<Partial<Product>> | { results?: Array<Partial<Product>> }
  ): Product[] {
    const rawItems = Array.isArray(response)
      ? response
      : Array.isArray(response?.results)
        ? response.results
        : [];

    const normalizedItems = rawItems
      .map((item) => this.normalizeProduct(item))
      .filter((item): item is Product => item !== null);

    if (rawItems.length > 0 && normalizedItems.length === 0) {
      throw new Error('Invalid products payload');
    }

    if (normalizedItems.length < rawItems.length) {
      console.warn('[ApiService] Alcuni record prodotto non validi sono stati ignorati.');
    }

    return normalizedItems;
  }

  private normalizeProduct(raw: Partial<Product>): Product | null {
    const parsedId = Number(raw?.id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return null;
    }
    const id = parsedId;
    const name = this.normalizeRequiredText(raw?.name);
    const brand = this.normalizeRequiredText(raw?.brand);
    const category = this.normalizeRequiredText(raw?.category);
    const price = this.normalizePrice(raw?.price);
    if (!name || !brand || !category || !price) {
      return null;
    }

    const originalPrice = this.normalizeNullablePrice(raw?.original_price);
    const discountPercentage =
      typeof raw?.discount_percentage === 'number' && Number.isFinite(raw.discount_percentage)
        ? raw.discount_percentage
        : null;
    const imageUrl = typeof raw?.image_url === 'string' ? raw.image_url.trim() : '';
    const stockQuantity =
      typeof (raw as { stock_quantity?: unknown })?.stock_quantity === 'number' &&
      Number.isFinite((raw as { stock_quantity: number }).stock_quantity) &&
      (raw as { stock_quantity: number }).stock_quantity >= 0
        ? Math.floor((raw as { stock_quantity: number }).stock_quantity)
        : 0;
    const availabilityStatusRaw =
      typeof (raw as { availability_status?: unknown })?.availability_status === 'string'
        ? ((raw as { availability_status: string }).availability_status.trim().toLowerCase() as string)
        : '';
    const availabilityStatus: Product['availability_status'] =
      availabilityStatusRaw === 'low_stock' || availabilityStatusRaw === 'out_of_stock'
        ? availabilityStatusRaw
        : 'in_stock';
    const createdAt =
      typeof (raw as { created_at?: unknown })?.created_at === 'string'
        ? (raw as { created_at: string }).created_at
        : undefined;

    return {
      id,
      name,
      brand,
      price,
      original_price:
        originalPrice && parseFloat(originalPrice) > parseFloat(price)
          ? originalPrice
          : null,
      discount_percentage: discountPercentage,
      image_url: imageUrl,
      category,
      description: typeof raw?.description === 'string' ? raw.description : '',
      technical_specs: typeof raw?.technical_specs === 'string' ? raw.technical_specs : '',
      is_featured: raw?.is_featured === true,
      created_at: createdAt,
      stock_quantity: stockQuantity,
      availability_status: availabilityStatus
    };
  }

  private normalizeRequiredText(value: string | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  }

  private normalizePrice(value: string | number | undefined): string | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toFixed(2);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const numeric = Number(trimmed.replace(',', '.'));
      if (!Number.isFinite(numeric) || numeric < 0) {
        return null;
      }
      return numeric.toFixed(2);
    }

    return null;
  }

  private normalizeNullablePrice(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return this.normalizePrice(value);
  }

  private buildQueryParams(params?: ProductQueryParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) {
      return httpParams;
    }

    if (params.on_sale === true) {
      httpParams = httpParams.set('on_sale', 'true');
    }

    if (params.featured === true) {
      httpParams = httpParams.set('featured', 'true');
    }

    if (params.exclude_featured === true) {
      httpParams = httpParams.set('exclude_featured', 'true');
    }

    if (params.exclude_on_sale === true) {
      httpParams = httpParams.set('exclude_on_sale', 'true');
    }

    if (params.recent === true) {
      httpParams = httpParams.set('recent', 'true');
    }

    if (params.purchasable === true) {
      httpParams = httpParams.set('purchasable', 'true');
    }

    Object.entries(params).forEach(([key, value]) => {
      if (
        key === 'on_sale' ||
        key === 'featured' ||
        key === 'exclude_featured' ||
        key === 'exclude_on_sale' ||
        key === 'recent' ||
        key === 'purchasable'
      ) {
        return;
      }
      if (value === null || value === undefined) {
        return;
      }

      const normalizedValue = typeof value === 'string' ? value.trim() : String(value);
      if (!normalizedValue) {
        return;
      }

      httpParams = httpParams.set(key, normalizedValue);
    });

    return httpParams;
  }

  private withRequestTimeout<T>(source$: Observable<T>): Observable<T> {
    return source$.pipe(
      timeout(ApiService.REQUEST_TIMEOUT_MS),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError || (error instanceof Error && error.name === 'TimeoutError')) {
          return throwError(() => new Error('Api request timeout'));
        }
        return throwError(() => error);
      })
    );
  }
}
