import { Product } from './api.service';
import type { Card } from '../cards/cards.component';

type ProductLike = Pick<Product, 'id' | 'name' | 'category' | 'image_url'>;

/** Normalizza fine riga (DRF/SQLite possono usare solo `\r`). */
export function normalizeMultilineText(value: string | null | undefined): string {
  return (value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Paragrafi descrizione (stessa logica della scheda prodotto). */
export function descriptionToParagraphs(description?: string | null): string[] {
  const raw = normalizeMultilineText(description).trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** Righe dati tecnici (stessa logica della scheda prodotto). */
export function technicalSpecsToLines(specs?: string | null): string[] {
  return normalizeMultilineText(specs)
    .split('\n')
    .map((line) => line.replace(/^[•\-\s]+/, '').trim())
    .filter(Boolean);
}

/**
 * Se la riga editoriale contiene `chiave: valore`, restituisce la coppia per una resa a tabella.
 * Altrimenti `null` (si mostra la riga intera).
 */
export function technicalSpecLineToKeyValue(line: string): { key: string; value: string } | null {
  const t = (line || '').trim();
  const idx = t.indexOf(':');
  if (idx <= 0) {
    return null;
  }
  const key = t.slice(0, idx).trim();
  const value = t.slice(idx + 1).trim();
  if (!key || !value) {
    return null;
  }
  return { key, value };
}

/** Riga dati tecnici per la scheda dettaglio (coppia o testo libero). */
export type TechnicalSpecDetailRow =
  | { kind: 'kv'; key: string; value: string }
  | { kind: 'line'; text: string };

/**
 * Chiavi ripetitive o prive di significo per l’utente → `null` (si mostra solo il valore API).
 */
export function technicalSpecDisplayKeyOrNull(key: string): string | null {
  const t = key.trim().replace(/\s+/g, ' ');
  if (!t) {
    return null;
  }
  if (/^voce\s+dettaglio$/i.test(t)) {
    return null;
  }
  if (/^dettaglio$/i.test(t)) {
    return null;
  }
  return key.trim();
}

export function technicalSpecLineToDetailRow(line: string): TechnicalSpecDetailRow {
  const kv = technicalSpecLineToKeyValue(line);
  if (!kv) {
    return { kind: 'line', text: line.trim() };
  }
  const displayKey = technicalSpecDisplayKeyOrNull(kv.key);
  if (displayKey === null) {
    return { kind: 'line', text: kv.value };
  }
  return { kind: 'kv', key: displayKey, value: kv.value };
}

/** SVG inline già usato da `resolveProductImage` quando manca un asset sicuro. */
export function productFallbackImageDataUrl(name: string, category?: string): string {
  return buildFallbackImage(name, category);
}

/**
 * Frasi chiave (normalizzate come in `normalizeLooseCompare`) per ordinare le righe
 * `technical_specs` nelle card catalogo per categoria. Solo riordino/priorità: il testo
 * mostrato resta quello editoriale del backend.
 */
const CATEGORY_SPEC_KEYWORDS: Record<string, Array<[string, number]>> = {
  tv: [
    ['pollici', 14],
    ['pollice', 12],
    ['risoluzione', 11],
    ['uhd', 12],
    ['4k', 12],
    ['8k', 12],
    ['oled', 11],
    ['qled', 11],
    ['neo qled', 13],
    ['mini led', 13],
    ['smart tv', 12],
    ['smart', 6],
    ['hdr', 10],
    ['dolby vision', 9],
    ['dolby', 6],
    ['hlg', 7],
    ['refresh', 9],
    ['hertz', 8],
    [' hz', 7],
    ['pixel', 7],
    ['led', 5]
  ],
  telefoni: [
    ['display', 11],
    ['schermo', 9],
    ['super retina', 12],
    ['fotocamera', 12],
    ['camera', 8],
    ['memoria interna', 13],
    ['memoria', 8],
    ['storage', 9],
    ['batteria', 11],
    ['autonomia', 10],
    ['chip', 10],
    ['processore', 10],
    ['connettivita', 9],
    ['5g', 10],
    ['wifi', 7],
    ['nfc', 6],
    ['pollici', 8]
  ],
  computer: [
    ['processore', 13],
    ['cpu', 11],
    ['intel', 10],
    ['ryzen', 10],
    ['apple m', 12],
    [' ram', 12],
    ['memoria ram', 12],
    ['ssd', 13],
    ['nvme', 11],
    ['storage', 9],
    ['disco', 7],
    ['gpu', 11],
    ['grafica', 10],
    ['rtx', 10],
    ['gtx', 9],
    ['display', 8],
    ['schermo', 8],
    ['tb', 7],
    [' gb', 6]
  ],
  elettrodomestici: [
    ['capacita', 13],
    ['litri', 11],
    [' kg', 11],
    ['coperti', 11],
    ['classe energetica', 13],
    ['energetica', 7],
    ['programmi', 10],
    ['centrifuga', 9],
    [' rpm', 8],
    ['giri', 7],
    ['frost', 9],
    ['no frost', 10],
    ['profondita', 7],
    ['dimensioni', 7],
    ['lavatrice', 6],
    ['lavastoviglie', 7],
    ['frigorifero', 6],
    ['forno', 5],
    ['formato', 5],
    ['inox', 5]
  ]
};

function scoreSpecLineForCategory(line: string, category: string): number {
  const hay = normalizeLooseCompare(line);
  if (!hay) {
    return 0;
  }
  const table = CATEGORY_SPEC_KEYWORDS[category];
  if (!table) {
    return 0;
  }
  let score = 0;
  for (const [needle, weight] of table) {
    const key = normalizeLooseCompare(needle);
    if (key && hay.includes(key)) {
      score += weight;
    }
  }
  return score;
}

/** Evita righe chilometriche in card: testo reale, solo accorciato visivamente. */
export function clampCatalogSpecLine(line: string, maxChars = 110): string {
  const t = line.trim();
  if (t.length <= maxChars) {
    return t;
  }
  const cut = t.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 32 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

/**
 * Fino a `maxItems` righe da `technical_specs`, utili al confronto rapido per categoria.
 * Contenuto sempre dal backend; ordine per punteggio lessicale + ordine originale a parità.
 */
export function pickCategoryListingSpecLines(
  technicalSpecs: string | null | undefined,
  category: string,
  maxItems = 4
): string[] {
  const lines = technicalSpecsToLines(technicalSpecs);
  if (!lines.length) {
    return [];
  }
  const cat = (category || '').toLowerCase();
  const prepared = lines.map((line) => clampCatalogSpecLine(line));
  const scored = prepared.map((line, index) => ({
    line,
    index,
    score: scoreSpecLineForCategory(line, cat)
  }));
  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of scored) {
    if (out.length >= maxItems) {
      break;
    }
    if (seen.has(row.line)) {
      continue;
    }
    seen.add(row.line);
    out.push(row.line);
  }
  return out;
}

/**
 * Sigle e marchi da non alterare mai (correttezza commerciale/tecnica).
 * In dubbio: preferire l’originale — lista estesa con cautela.
 */
const PRESERVED_ACRONYMS = new Set(
  [
    'LG',
    'TV',
    'UHD',
    'OLED',
    'QLED',
    'AI',
    'GB',
    'HD',
    'LED',
    'HDR',
    'HDR10',
    'SMART',
    'WIFI',
    'NFC',
    'GPS',
    'LTE',
    'TB',
    'RAM',
    'SSD',
    'USB',
    'CPU',
    'GPU',
    'XR',
    'DC',
    'AC',
    'CD',
    'DVD',
    'DCI',
    'BT',
    '5G',
    '4K',
    '8K',
    'OPPO',
    'VESA'
  ].map((s) => s.toUpperCase())
);

/** Codici modello tipo UE43…, numeri di serie alfanumerici lunghi: non toccare. */
const MODEL_CODE_LIKE = /\b[A-Z]{0,4}\d{2,}[A-Z0-9-]{2,}\b/i;

function countAcronymHits(upperName: string): number {
  let n = 0;
  for (const a of PRESERVED_ACRONYMS) {
    const re = new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (re.test(upperName)) {
      n++;
    }
  }
  return n;
}

/**
 * Titoli molto “da scheda tecnica”: meglio lasciare il naming originale.
 */
function isHighlyTechnicalProductTitle(name: string): boolean {
  const u = name.toUpperCase();
  const ac = countAcronymHits(u);
  const tokens = name.split(/[\s,;]+/).filter(Boolean);
  const digitTokens = tokens.filter((tok) => /\d/.test(tok)).length;
  const modelHits = (name.match(MODEL_CODE_LIKE) || []).length;

  if (modelHits >= 1) {
    return true;
  }
  if (ac >= 3) {
    return true;
  }
  if (digitTokens >= 2) {
    return true;
  }
  if (ac >= 2 && digitTokens >= 1) {
    return true;
  }
  return false;
}

function shouldPreserveAllCapsToken(lettersOnly: string, fullPart: string): boolean {
  if (!lettersOnly || lettersOnly.length <= 1) {
    return true;
  }
  if (/\d/.test(fullPart)) {
    return true;
  }
  if (lettersOnly.length <= 3) {
    return true;
  }
  if (PRESERVED_ACRONYMS.has(lettersOnly.toUpperCase())) {
    return true;
  }
  return false;
}

/**
 * Rende leggermente più leggibili solo i titoli tutto maiuscolo e poco tecnici.
 * Con molte sigle/codici o densità tecnica alta → resta l’originale.
 */
export function formatProductTitleForCardDisplay(name: string): string {
  const t = (name || '').trim();
  if (!t) {
    return t;
  }

  if (isHighlyTechnicalProductTitle(t)) {
    return t;
  }

  let latin = 0;
  let upper = 0;
  for (const ch of t) {
    if (/[A-Za-zÀ-ÿ]/.test(ch)) {
      latin++;
      if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) {
        upper++;
      }
    }
  }
  if (latin < 10 || upper / latin < 0.78) {
    return t;
  }

  return t
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part.length === 0) {
        return part;
      }
      const lettersOnly = part.replace(/[^A-Za-zÀ-ÿ]/g, '');
      if (!lettersOnly) {
        return part;
      }
      if (lettersOnly !== lettersOnly.toUpperCase()) {
        return part;
      }
      if (shouldPreserveAllCapsToken(lettersOnly, part)) {
        return part;
      }
      const m = part.match(/^([^A-Za-zÀ-ÿ]*)([A-Za-zÀ-ÿ]+)(.*)$/);
      if (!m) {
        return part;
      }
      const [, lead, word, trail] = m;
      const w =
        word.charAt(0).toLocaleUpperCase('it-IT') +
        word.slice(1).toLocaleLowerCase('it-IT');
      return `${lead}${w}${trail}`;
    })
    .join('');
}

/** Anteprima breve per le card catalogo; il dettaglio prodotto resta completo. */
export function excerptForProductCard(description: string | null | undefined, maxLen = 200): string | undefined {
  const normalized = normalizeMultilineText(description).trim();
  if (!normalized) {
    return undefined;
  }
  const singleLine = normalized.replace(/\s+/g, ' ');
  if (singleLine.length <= maxLen) {
    return singleLine;
  }
  const cut = singleLine.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

function normalizeLooseCompare(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True se l’anteprima descrizione ripete sostanzialmente il titolo (poco valore in card home).
 */
export function isDescriptionRedundantWithTitle(cardTitle: string, excerpt: string | undefined): boolean {
  if (!excerpt) {
    return true;
  }
  const t = normalizeLooseCompare(cardTitle);
  const d = normalizeLooseCompare(excerpt);
  if (!t || !d) {
    return false;
  }
  if (d.startsWith(t.slice(0, Math.min(48, t.length)))) {
    return true;
  }
  if (t.length >= 18 && d.startsWith(t.slice(0, 18))) {
    return true;
  }
  const shorter = t.length <= d.length ? t : d;
  const longer = t.length > d.length ? t : d;
  if (shorter.length >= 24 && longer.startsWith(shorter.slice(0, 24))) {
    return longer.length <= Math.ceil(shorter.length * 1.35);
  }
  return false;
}

const PRODUCT_IMAGE_OVERRIDES: Record<number, string> = {
  1: '/iPhone-16-pro.jpg',
  2: '/iphone-16-plus.jpg',
  3: '/iPhone-16-pro-max.jpg',
  4: '/iPhone-16-pro.jpg',
  5: '/iPhone-17-pro-max.jpg',
  6: '/iPhone-17-pro.jpg',
  7: '/iPhone-17.jpg',
  8: '/LG-GBV3100DPY.jpg',
  9: '/ELECTROLUX-EW6S306BL.jpg',
  10: '/BEKO-DVN05320X.jpg',
  11: '/SAMSUNG-UE43CU7090UXZT.jpg',
  12: '/SAMSUNG-UE43DU7170UXZ.jpg',
  13: '/SAMSUNG-QE55QN85DBTXZT.jpg',
  14: '/SAMSUNG-QE50Q60DAU.jpg'
};

export function normalizeImagePath(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return '';
  }

  if (/^(https?:)?\/\//.test(imageUrl) || imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
}

/** Codifica i segmenti del path per nomi file con spazi, virgole, +, ecc. (cartella public/). */
export function encodeLocalPublicImagePath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    return path;
  }

  const rest = path.slice(1);
  if (!rest) {
    return '/';
  }

  return `/${rest.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`;
}

function isSafeLocalPublicPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }
  if (path.includes('..') || path.includes('\\')) {
    return false;
  }
  return path.length <= 512;
}

export function getCategoryRoute(category?: string): string[] {
  switch ((category || '').toLowerCase()) {
    case 'tv':
      return ['/tv'];
    case 'telefoni':
      return ['/telefoni'];
    case 'elettrodomestici':
      return ['/elettrodomestici'];
    case 'computer':
      return ['/computer'];
    default:
      return ['/home'];
  }
}

/**
 * Slug per `productToCatalogCard` / `pickCategoryListingSpecLines` su listing miste (es. offerte):
 * se la categoria API corrisponde a un reparto catalogo noto, si riusa lo stesso scoring delle card categoria;
 * altrimenti slug interno senza tabella keyword → punteggio 0, ordine = ordine delle righe in `technical_specs` (dati reali API).
 */
const CATALOG_LISTING_NEUTRAL_SLUG = '__listing_neutral__';

export function catalogListingCategorySlugFromProduct(productCategory?: string | null): string {
  const c = productCategory?.trim().toLowerCase() ?? '';
  if (c && getCategoryRoute(c)[0] !== '/home') {
    return c;
  }
  return CATALOG_LISTING_NEUTRAL_SLUG;
}

export function getCategoryLabel(category?: string): string {
  switch ((category || '').toLowerCase()) {
    case 'tv':
      return 'TV';
    case 'telefoni':
      return 'Telefonia';
    case 'elettrodomestici':
      return 'Elettrodomestici';
    case 'computer':
      return 'Computer';
    default:
      return 'Prodotto';
  }
}

/** Testo link “indietro” nella scheda prodotto (slug invariati, solo copy UX). */
export function getCategoryReturnLinkText(category?: string): string {
  switch ((category || '').toLowerCase()) {
    case 'telefoni':
      return 'Torna alla telefonia';
    case 'tv':
      return 'Torna al reparto TV';
    case 'computer':
      return 'Torna al reparto Computer';
    case 'elettrodomestici':
      return 'Torna al reparto Elettrodomestici';
    default:
      return 'Torna alla categoria';
  }
}

export function resolveProductImage(product: ProductLike): string {
  const overrideImage = PRODUCT_IMAGE_OVERRIDES[product.id];
  if (overrideImage) {
    const normalizedOverride = normalizeImagePath(overrideImage);
    if (normalizedOverride && isSafeLocalPublicPath(normalizedOverride)) {
      return encodeLocalPublicImagePath(normalizedOverride);
    }
  }

  const normalizedImage = normalizeImagePath(product.image_url);

  if (!normalizedImage) {
    return buildFallbackImage(product.name, product.category);
  }

  if (/^(https?:)?\/\//.test(normalizedImage) || normalizedImage.startsWith('data:')) {
    return normalizedImage;
  }

  if (isSafeLocalPublicPath(normalizedImage)) {
    return encodeLocalPublicImagePath(normalizedImage);
  }

  return buildFallbackImage(product.name, product.category);
}

export function buildProductGallery(product: ProductLike): string[] {
  return [resolveProductImage(product)];
}

function buildFallbackImage(name: string, category?: string): string {
  const categoryLabel = getCategoryLabel(category);
  const shortName = truncate(name, 42);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" role="img" aria-label="${escapeXml(name)}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f4f4f4" />
          <stop offset="100%" stop-color="#e7e7e7" />
        </linearGradient>
      </defs>
      <rect width="640" height="640" rx="36" fill="url(#bg)" />
      <rect x="72" y="88" width="496" height="464" rx="28" fill="#ffffff" stroke="#d9d9d9" stroke-width="8" />
      <text x="320" y="228" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#1D4ED8">${escapeXml(categoryLabel)}</text>
      <text x="320" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#333333">Immagine non presente nel repository</text>
      <text x="320" y="366" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#111111">${escapeXml(shortName)}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatEuro(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(n)) {
    return typeof value === 'string' ? (value.includes('€') ? value : `${value} €`) : String(value);
  }
  return `${n.toFixed(2).replace('.', ',')} €`;
}

function computeDiscountPct(original: string, price: string): number {
  const o = parseFloat(original);
  const p = parseFloat(price);
  if (!Number.isFinite(o) || !Number.isFinite(p) || o <= p) {
    return 0;
  }
  return Math.round((1 - p / o) * 100);
}

export interface ProductToCatalogCardOptions {
  idPrefix?: string;
  excerptMaxLen?: number;
  /** In home: evita excerpt che ripetono il titolo (card più leggere). */
  omitRedundantExcerpt?: boolean;
  /**
   * Slug categoria (`tv`, `telefoni`, …): niente descrizione in card; fino a 4 righe da
   * `technical_specs` ordinate per rilevanza (testo reale API).
   */
  categoryListingFrom?: string;
  categoryListingMaxSpecs?: number;
}

/** Mappa un prodotto API alle card catalogo (prezzi, sconto, link a scheda). */
export function productToCatalogCard(p: Product, options?: ProductToCatalogCardOptions): Card {
  const idPrefix = options?.idPrefix ?? '';
  const excerptMaxLen = options?.excerptMaxLen ?? 160;
  const origRaw = p.original_price?.trim() ? p.original_price : null;
  const priceRaw = p.price;
  const onSale = !!origRaw && parseFloat(origRaw) > parseFloat(priceRaw);

  const discountPct =
    onSale && p.discount_percentage != null && p.discount_percentage > 0
      ? p.discount_percentage
      : onSale && origRaw
        ? computeDiscountPct(origRaw, priceRaw)
        : undefined;

  const title = formatProductTitleForCardDisplay(p.name);
  const listingCat = options?.categoryListingFrom?.trim().toLowerCase();

  let excerpt: string | undefined;
  let keyHighlights: string[] | undefined;
  if (listingCat) {
    excerpt = undefined;
    keyHighlights = pickCategoryListingSpecLines(
      p.technical_specs,
      listingCat,
      options?.categoryListingMaxSpecs ?? 4
    );
    if (!keyHighlights.length) {
      keyHighlights = undefined;
    }
  } else {
    excerpt = excerptForProductCard(p.description, excerptMaxLen);
    if (options?.omitRedundantExcerpt && isDescriptionRedundantWithTitle(title, excerpt)) {
      excerpt = undefined;
    }
  }

  const imageDescription = title.trim() || p.name?.trim() || 'Prodotto';

  return {
    id: `${idPrefix}${p.id}`,
    productId: p.id,
    link: ['/products', String(p.id)],
    imgSrc: resolveProductImage(p),
    imgAlt: imageDescription,
    title,
    keyHighlights,
    description: excerpt,
    detailsLinkText: 'Vedi dettagli',
    price: formatEuro(priceRaw),
    originalPrice: onSale && origRaw ? formatEuro(origRaw) : undefined,
    discountPercentage: discountPct && discountPct > 0 ? discountPct : undefined,
    availabilityStatus: p.availability_status
  };
}
