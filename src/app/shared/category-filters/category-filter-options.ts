import type { Product } from '../../services/api.service';
import {
  extractApplianceCapacityLabel,
  extractApplianceType,
  extractBrand,
  extractCpuFamily,
  extractEnergyClass,
  extractPhoneDisplayInches,
  extractPhoneRamGb,
  extractPhoneStorageGb,
  extractRamGbValues,
  extractStorageGbValues,
  extractTvInches,
  extractTvPanelBucket,
  extractTvResolutionBucket,
  parsePriceEUR,
  storageGbLabel
} from './category-product-facet-extractors';
import { PRICE_FILTER_BUCKETS } from './category-filter-config';
import type { CategoryFilterId } from './category-filter.types';

export interface SelectOption {
  value: string;
  label: string;
}

function uniqSortedStrings(values: (string | null | undefined)[]): string[] {
  const s = new Set<string>();
  for (const v of values) {
    const t = (v || '').trim();
    if (t) {
      s.add(t);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}

function uniqSortedNumbers(values: (number | null | undefined)[]): number[] {
  const s = new Set<number>();
  for (const v of values) {
    if (v !== null && v !== undefined && Number.isFinite(v)) {
      s.add(v);
    }
  }
  return [...s].sort((a, b) => a - b);
}

export function buildSelectOptionsForControl(
  category: CategoryFilterId,
  controlId: string,
  products: Product[]
): SelectOption[] {
  switch (category) {
    case 'computer':
      return computerOptions(controlId, products);
    case 'tv':
      return tvOptions(controlId, products);
    case 'telefoni':
      return phoneOptions(controlId, products);
    case 'elettrodomestici':
      return applianceOptions(controlId, products);
    default:
      return [];
  }
}

function computerOptions(controlId: string, products: Product[]): SelectOption[] {
  if (controlId === 'brand') {
    return uniqSortedStrings(products.map((p) => extractBrand(p))).map((b) => ({ value: b, label: b }));
  }
  if (controlId === 'price') {
    return PRICE_FILTER_BUCKETS.map((b) => ({ value: b.id, label: b.label }));
  }
  if (controlId === 'ram') {
    const nums = new Set<number>();
    for (const p of products) {
      for (const g of extractRamGbValues(p)) {
        nums.add(g);
      }
    }
    return [...nums]
      .sort((a, b) => a - b)
      .map((g) => ({ value: String(g), label: `${g} GB` }));
  }
  if (controlId === 'storage') {
    const nums = new Set<number>();
    for (const p of products) {
      for (const g of extractStorageGbValues(p)) {
        nums.add(g);
      }
    }
    return [...nums]
      .sort((a, b) => a - b)
      .map((g) => ({ value: String(g), label: storageGbLabel(g) }));
  }
  if (controlId === 'processor') {
    return uniqSortedStrings(products.map((p) => extractCpuFamily(p))).map((b) => ({
      value: b,
      label: b
    }));
  }
  return [];
}

function tvOptions(controlId: string, products: Product[]): SelectOption[] {
  if (controlId === 'brand') {
    return uniqSortedStrings(products.map((p) => extractBrand(p))).map((b) => ({ value: b, label: b }));
  }
  if (controlId === 'price') {
    return PRICE_FILTER_BUCKETS.map((b) => ({ value: b.id, label: b.label }));
  }
  if (controlId === 'inches') {
    return uniqSortedNumbers(products.map((p) => extractTvInches(p))).map((n) => ({
      value: String(n),
      label: `${n}"`
    }));
  }
  if (controlId === 'resolution') {
    return uniqSortedStrings(products.map((p) => extractTvResolutionBucket(p))).map((b) => ({
      value: b,
      label: b
    }));
  }
  if (controlId === 'panel') {
    return uniqSortedStrings(products.map((p) => extractTvPanelBucket(p))).map((b) => ({
      value: b,
      label: b
    }));
  }
  return [];
}

function phoneOptions(controlId: string, products: Product[]): SelectOption[] {
  if (controlId === 'brand') {
    return uniqSortedStrings(products.map((p) => extractBrand(p))).map((b) => ({ value: b, label: b }));
  }
  if (controlId === 'price') {
    return PRICE_FILTER_BUCKETS.map((b) => ({ value: b.id, label: b.label }));
  }
  if (controlId === 'storage') {
    return uniqSortedNumbers(products.map((p) => extractPhoneStorageGb(p))).map((g) => ({
      value: String(g),
      label: `${g} GB`
    }));
  }
  if (controlId === 'ram') {
    return uniqSortedNumbers(products.map((p) => extractPhoneRamGb(p))).map((g) => ({
      value: String(g),
      label: `${g} GB`
    }));
  }
  if (controlId === 'display') {
    return uniqSortedNumbers(products.map((p) => extractPhoneDisplayInches(p))).map((n) => ({
      value: String(n),
      label: `${n}"`.replace('.', ',')
    }));
  }
  return [];
}

function applianceOptions(controlId: string, products: Product[]): SelectOption[] {
  if (controlId === 'brand') {
    return uniqSortedStrings(products.map((p) => extractBrand(p))).map((b) => ({ value: b, label: b }));
  }
  if (controlId === 'price') {
    return PRICE_FILTER_BUCKETS.map((b) => ({ value: b.id, label: b.label }));
  }
  if (controlId === 'tipo') {
    return uniqSortedStrings(products.map((p) => extractApplianceType(p))).map((b) => ({
      value: b,
      label: b
    }));
  }
  if (controlId === 'energy') {
    return uniqSortedStrings(products.map((p) => extractEnergyClass(p))).map((b) => ({
      value: b,
      label: `Classe ${b}`
    }));
  }
  if (controlId === 'capacity') {
    return uniqSortedStrings(products.map((p) => extractApplianceCapacityLabel(p))).map((b) => ({
      value: b,
      label: b
    }));
  }
  return [];
}

export function priceMatchesBucket(price: number, bucketId: string): boolean {
  const b = PRICE_FILTER_BUCKETS.find((x) => x.id === bucketId);
  if (!b) {
    return true;
  }
  return price >= b.min && price <= b.max;
}

export function productPassesCategoryFilters(
  category: CategoryFilterId,
  product: Product,
  selection: Record<string, string>
): boolean {
  const price = parsePriceEUR(product);
  const brandSel = (selection['brand'] || '').trim();
  if (brandSel) {
    const b = extractBrand(product);
    if (!b || b.localeCompare(brandSel, 'it', { sensitivity: 'accent' }) !== 0) {
      return false;
    }
  }
  const priceSel = (selection['price'] || '').trim();
  if (priceSel && Number.isFinite(price)) {
    if (!priceMatchesBucket(price, priceSel)) {
      return false;
    }
  }

  switch (category) {
    case 'computer': {
      const ramSel = (selection['ram'] || '').trim();
      if (ramSel) {
        const want = Number.parseInt(ramSel, 10);
        const have = extractRamGbValues(product);
        if (!have.includes(want)) {
          return false;
        }
      }
      const stSel = (selection['storage'] || '').trim();
      if (stSel) {
        const want = Number.parseInt(stSel, 10);
        const have = extractStorageGbValues(product);
        if (!have.includes(want)) {
          return false;
        }
      }
      const cpuSel = (selection['processor'] || '').trim();
      if (cpuSel) {
        if ((extractCpuFamily(product) || '') !== cpuSel) {
          return false;
        }
      }
      return true;
    }
    case 'tv': {
      const inchSel = (selection['inches'] || '').trim();
      if (inchSel) {
        const want = Number.parseInt(inchSel, 10);
        const have = extractTvInches(product);
        if (have !== want) {
          return false;
        }
      }
      const resSel = (selection['resolution'] || '').trim();
      if (resSel) {
        if ((extractTvResolutionBucket(product) || '') !== resSel) {
          return false;
        }
      }
      const panSel = (selection['panel'] || '').trim();
      if (panSel) {
        if ((extractTvPanelBucket(product) || '') !== panSel) {
          return false;
        }
      }
      return true;
    }
    case 'telefoni': {
      const stSel = (selection['storage'] || '').trim();
      if (stSel) {
        const want = Number.parseInt(stSel, 10);
        const have = extractPhoneStorageGb(product);
        if (have !== want) {
          return false;
        }
      }
      const ramSel = (selection['ram'] || '').trim();
      if (ramSel) {
        const want = Number.parseInt(ramSel, 10);
        const have = extractPhoneRamGb(product);
        if (have !== want) {
          return false;
        }
      }
      const dSel = (selection['display'] || '').trim();
      if (dSel) {
        const want = Number.parseFloat(dSel.replace(',', '.'));
        const have = extractPhoneDisplayInches(product);
        if (have === null || Math.abs(have - want) > 0.05) {
          return false;
        }
      }
      return true;
    }
    case 'elettrodomestici': {
      const tipoSel = (selection['tipo'] || '').trim();
      if (tipoSel) {
        if ((extractApplianceType(product) || '') !== tipoSel) {
          return false;
        }
      }
      const enSel = (selection['energy'] || '').trim();
      if (enSel) {
        if ((extractEnergyClass(product) || '') !== enSel) {
          return false;
        }
      }
      const capSel = (selection['capacity'] || '').trim();
      if (capSel) {
        if ((extractApplianceCapacityLabel(product) || '') !== capSel) {
          return false;
        }
      }
      return true;
    }
    default:
      return true;
  }
}

export function applyCategoryProductFilters(
  category: CategoryFilterId,
  products: Product[],
  selection: Record<string, string>
): Product[] {
  return products.filter((p) => productPassesCategoryFilters(category, p, selection));
}
