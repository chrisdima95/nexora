import { Product } from './api.service';
import {
  pickDiverseProducts,
  productSaleDiscountPct,
  sortProductsBySaleDiscountDesc
} from './home-product-selection';

describe('home-product-selection', () => {
  const p = (
    id: number,
    category: string,
    brand: string,
    price: string,
    original?: string | null
  ): Product => ({
    id,
    name: `Product ${id}`,
    brand,
    price,
    original_price: original ?? null,
    image_url: '',
    category,
    description: ''
  });

  it('computes discount percentage from list price and current price', () => {
    expect(productSaleDiscountPct(p(1, 'tv', 'ACME', '800', '1000'))).toBe(20);
    expect(productSaleDiscountPct(p(2, 'tv', 'ACME', '100', null))).toBe(0);
  });

  it('sorts on-sale products by discount descending', () => {
    const a = p(1, 'tv', 'A', '500', '1000');
    const b = p(2, 'tv', 'B', '900', '1000');
    const c = p(3, 'tv', 'C', '100', '1000');
    const sorted = sortProductsBySaleDiscountDesc([a, b, c]);
    expect(sorted.map((x) => x.id)).toEqual([3, 1, 2]);
  });

  it('round-robin picks across categories before repeating', () => {
    const products: Product[] = [
      p(1, 'telefoni', 'A', '100'),
      p(2, 'telefoni', 'B', '110'),
      p(3, 'tv', 'C', '200'),
      p(4, 'elettrodomestici', 'D', '300'),
      p(5, 'telefoni', 'E', '120')
    ];
    const picked = pickDiverseProducts(products, 4, { maxPerCategory: 2, maxPerBrand: 2 });
    expect(picked.map((x) => x.category)).toEqual(['telefoni', 'tv', 'elettrodomestici', 'telefoni']);
  });

  it('prefers spreading brands before the final fill pass', () => {
    const products: Product[] = [
      p(1, 'telefoni', 'Same', '100'),
      p(2, 'telefoni', 'Same', '110'),
      p(3, 'tv', 'Other', '500'),
      p(4, 'elettrodomestici', 'Third', '300')
    ];
    const picked = pickDiverseProducts(products, 3, { maxPerCategory: 3, maxPerBrand: 1 });
    expect(picked.map((x) => x.id)).toEqual([1, 3, 4]);
  });
});
