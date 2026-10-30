import { Product } from './api.service';

function categoryKey(p: Product): string {
  return (p.category || '').trim().toLowerCase() || 'altro';
}

function brandKey(p: Product): string {
  return (p.brand || '').trim().toLowerCase();
}

export function parseProductPrice(value: string | undefined): number {
  if (value == null || value === '') {
    return NaN;
  }
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : NaN;
}

/** Percentuale sconto reale da listino vs prezzo corrente (0 se non in promozione). */
export function productSaleDiscountPct(p: Product): number {
  const origRaw = p.original_price?.trim() ? p.original_price : '';
  if (!origRaw) {
    return 0;
  }
  const o = parseFloat(origRaw);
  const price = parseProductPrice(p.price);
  if (!Number.isFinite(o) || !Number.isFinite(price) || o <= price) {
    return 0;
  }
  return Math.round((1 - price / o) * 100);
}

/**
 * Seleziona fino a `target` prodotti alternando categorie e limitando ripetizioni di marchio,
 * mantenendo l’ordine di ingresso dentro ogni categoria (es. API già ordinata per sconto o per data).
 */
export function pickDiverseProducts(
  products: Product[],
  target: number,
  options?: {
    maxPerCategory?: number;
    maxPerBrand?: number;
    categoryRotation?: string[];
  }
): Product[] {
  const maxPerCategory = options?.maxPerCategory ?? 3;
  const maxPerBrand = options?.maxPerBrand ?? 2;
  const defaultRotation = ['telefoni', 'tv', 'elettrodomestici'];
  const rotation = options?.categoryRotation ?? defaultRotation;

  if (target <= 0 || products.length === 0) {
    return [];
  }

  const byCategory = new Map<string, Product[]>();
  for (const p of products) {
    const c = categoryKey(p);
    if (!byCategory.has(c)) {
      byCategory.set(c, []);
    }
    byCategory.get(c)!.push(p);
  }

  const orderedCategories = [
    ...rotation.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !rotation.includes(c))
  ];

  const result: Product[] = [];
  const used = new Set<number>();
  const catCount = new Map<string, number>();
  const brandCount = new Map<string, number>();

  const canTake = (p: Product): boolean => {
    const c = categoryKey(p);
    const b = brandKey(p);
    if ((catCount.get(c) ?? 0) >= maxPerCategory) {
      return false;
    }
    if (b && (brandCount.get(b) ?? 0) >= maxPerBrand) {
      return false;
    }
    return true;
  };

  const take = (p: Product) => {
    result.push(p);
    used.add(p.id);
    const c = categoryKey(p);
    const b = brandKey(p);
    catCount.set(c, (catCount.get(c) ?? 0) + 1);
    if (b) {
      brandCount.set(b, (brandCount.get(b) ?? 0) + 1);
    }
  };

  let progress = true;
  while (result.length < target && progress) {
    progress = false;
    for (const c of orderedCategories) {
      if (result.length >= target) {
        break;
      }
      const list = byCategory.get(c) ?? [];
      const next = list.find((p) => !used.has(p.id) && canTake(p));
      if (next) {
        take(next);
        progress = true;
      }
    }
  }

  for (const p of products) {
    if (result.length >= target) {
      break;
    }
    if (used.has(p.id) || !canTake(p)) {
      continue;
    }
    take(p);
  }

  for (const p of products) {
    if (result.length >= target) {
      break;
    }
    if (!used.has(p.id)) {
      take(p);
    }
  }

  return result.slice(0, target);
}

/** Ordina per sconto decrescente (stesso criterio percepito in vetrina promozionale). */
export function sortProductsBySaleDiscountDesc(products: Product[]): Product[] {
  return [...products].sort((a, b) => productSaleDiscountPct(b) - productSaleDiscountPct(a));
}
