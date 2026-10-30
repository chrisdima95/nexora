import type { Product } from './api.service';

export function canAddToCart(product: Pick<Product, 'availability_status'>): boolean {
  return product.availability_status !== 'out_of_stock';
}

export function availabilityLabel(status: Product['availability_status']): string {
  switch (status) {
    case 'out_of_stock':
      return 'Esaurito';
    case 'low_stock':
      return 'In esaurimento';
    default:
      return 'Disponibile';
  }
}

export function availabilityClass(status: Product['availability_status']): string {
  switch (status) {
    case 'out_of_stock':
      return 'availability-badge--out';
    case 'low_stock':
      return 'availability-badge--low';
    default:
      return 'availability-badge--in';
  }
}
