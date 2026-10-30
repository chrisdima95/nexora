import type { Product } from './api.service';

export type CatalogSortKey =
  | 'recent'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'name-desc'
  | 'discount-desc';

export interface CatalogSortOption {
  value: CatalogSortKey;
  label: string;
}

export const BASE_CATALOG_SORT_OPTIONS: CatalogSortOption[] = [
  { value: 'recent', label: 'Piu recenti' },
  { value: 'price-asc', label: 'Prezzo crescente' },
  { value: 'price-desc', label: 'Prezzo decrescente' },
  { value: 'name-asc', label: 'Nome A-Z' },
  { value: 'name-desc', label: 'Nome Z-A' }
];

export const OFFERS_SORT_OPTIONS: CatalogSortOption[] = [
  { value: 'discount-desc', label: 'Sconto maggiore' },
  ...BASE_CATALOG_SORT_OPTIONS
];

const SORT_KEYS = new Set<CatalogSortKey>([
  'recent',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
  'discount-desc'
]);

export function isCatalogSortKey(value: string): value is CatalogSortKey {
  return SORT_KEYS.has(value as CatalogSortKey);
}

export function toBackendOrdering(sort: CatalogSortKey): string | undefined {
  switch (sort) {
    case 'price-asc':
      return 'price';
    case 'price-desc':
      return '-price';
    case 'name-asc':
      return 'name';
    case 'name-desc':
      return '-name';
    case 'recent':
      return '-created_at';
    default:
      return undefined;
  }
}

function toNumberPrice(price: string | null | undefined): number {
  if (!price) {
    return 0;
  }
  const parsed = Number(String(price).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function discountPercentage(product: Product): number {
  if (typeof product.discount_percentage === 'number' && Number.isFinite(product.discount_percentage)) {
    return product.discount_percentage;
  }
  if (!product.original_price) {
    return 0;
  }
  const original = toNumberPrice(product.original_price);
  const current = toNumberPrice(product.price);
  if (!Number.isFinite(original) || !Number.isFinite(current) || original <= current || original <= 0) {
    return 0;
  }
  return Math.round((1 - current / original) * 100);
}

function compareRecent(a: Product, b: Product): number {
  const aTs = a.created_at ? Date.parse(a.created_at) : Number.NaN;
  const bTs = b.created_at ? Date.parse(b.created_at) : Number.NaN;
  if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
    return bTs - aTs;
  }
  return b.id - a.id;
}

export function sortProducts(products: Product[], sort: CatalogSortKey): Product[] {
  const copy = [...products];
  copy.sort((a, b) => {
    switch (sort) {
      case 'price-asc': {
        const diff = toNumberPrice(a.price) - toNumberPrice(b.price);
        return diff !== 0 ? diff : a.id - b.id;
      }
      case 'price-desc': {
        const diff = toNumberPrice(b.price) - toNumberPrice(a.price);
        return diff !== 0 ? diff : a.id - b.id;
      }
      case 'name-asc': {
        const diff = a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });
        return diff !== 0 ? diff : a.id - b.id;
      }
      case 'name-desc': {
        const diff = b.name.localeCompare(a.name, 'it', { sensitivity: 'base' });
        return diff !== 0 ? diff : a.id - b.id;
      }
      case 'discount-desc': {
        const diff = discountPercentage(b) - discountPercentage(a);
        if (diff !== 0) {
          return diff;
        }
        return compareRecent(a, b);
      }
      case 'recent':
      default:
        return compareRecent(a, b);
    }
  });
  return copy;
}
