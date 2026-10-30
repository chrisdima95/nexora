import { normalizeMultilineText } from '../../services/product-ui';
import type { Product } from '../../services/api.service';

const COMMON_RAM_GB = new Set([4, 6, 8, 12, 16, 24, 32, 64, 128]);

function linesOf(product: Product): string[] {
  const blob = `${product.name || ''}\n${product.technical_specs || ''}`;
  return normalizeMultilineText(blob)
    .split('\n')
    .map((l) => l.replace(/\u0009/g, '\t').trim())
    .filter(Boolean);
}

function fullText(product: Product): string {
  return normalizeMultilineText(`${product.name || ''}\n${product.technical_specs || ''}`);
}

export function parsePriceEUR(product: Product): number {
  const raw = (product.price || '').toString().replace(',', '.').trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : NaN;
}

/** Marca da campo API (mai inventata). */
export function extractBrand(product: Product): string | null {
  const b = (product.brand || '').trim();
  return b ? b : null;
}

function parseGbFromMatch(num: string, unit: string | undefined): number {
  const n = Number.parseInt(num, 10);
  if (!Number.isFinite(n)) {
    return NaN;
  }
  const u = (unit || 'GB').toUpperCase();
  if (u.startsWith('T')) {
    return n * 1000;
  }
  return n;
}

/**
 * Estrae capacità RAM in GB dalle righe reali (scheda tecnica / nome).
 * Se una riga elenca più tagli (es. 16 o 32 GB), restituisce tutte le opzioni rilevanti.
 */
export function extractRamGbValues(product: Product): number[] {
  const lines = linesOf(product);
  const found = new Set<number>();
  for (const line of lines) {
    const hay = line.toUpperCase();
    const looksRam =
      /\bRAM\b/i.test(line) ||
      /\bMEMORIA\s+RAM\b/i.test(line) ||
      (/\bMEMORIA\b/i.test(line) && /\b(DDR|LPDDR| SDRAM|UNIFICATA)\b/i.test(line));
    if (!looksRam) {
      continue;
    }
    const re = /(\d+)\s*(GB|TB)\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const gb = parseGbFromMatch(m[1], m[2]);
      if (!Number.isFinite(gb)) {
        continue;
      }
      if (COMMON_RAM_GB.has(gb) || (gb >= 4 && gb <= 128 && gb % 4 === 0)) {
        found.add(gb);
      }
    }
  }
  return [...found].sort((a, b) => a - b);
}

/**
 * Storage principale in GB (SSD / archiviazione / storage da scheda).
 */
export function extractStorageGbValues(product: Product): number[] {
  const lines = linesOf(product);
  const found = new Set<number>();
  const mark = (line: string) => {
    const re = /(\d+)\s*(GB|TB)\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const gb = parseGbFromMatch(m[1], m[2]);
      if (!Number.isFinite(gb) || gb < 32) {
        continue;
      }
      found.add(gb);
    }
  };
  for (const line of lines) {
    if (/storage|archiviazione|ssd|nvme|memoria interna|disco/i.test(line)) {
      mark(line);
    }
  }
  if (!found.size) {
    const t = fullText(product);
    const m = t.match(/\b(\d+)\s*(GB|TB)\b/gi);
    if (m) {
      for (const chunk of m) {
        const mm = chunk.match(/(\d+)\s*(GB|TB)/i);
        if (mm) {
          const gb = parseGbFromMatch(mm[1], mm[2]);
          if (Number.isFinite(gb) && gb >= 32) {
            found.add(gb);
          }
        }
      }
    }
  }
  return [...found].sort((a, b) => a - b);
}

export function extractCpuFamily(product: Product): 'Apple' | 'Intel' | 'AMD' | null {
  const t = fullText(product).toLowerCase();
  if (/\bapple\b.*\b(m\d|a\d|chip)/i.test(t) || /\bchip:\s*apple\b/i.test(t) || /\bapple\s+m/i.test(t)) {
    return 'Apple';
  }
  if (/\bintel\b|\bcore\s+(ultra|i\d)/i.test(t)) {
    return 'Intel';
  }
  if (/\bamd\b|\bryzen\b/i.test(t)) {
    return 'AMD';
  }
  return null;
}

function tvInchesFromText(t: string): number | null {
  const candidates: number[] = [];
  const reQuote = /(\d+)\s*"/g;
  let m: RegExpExecArray | null;
  while ((m = reQuote.exec(t))) {
    const n = Number.parseInt(m[1], 10);
    if (n >= 20 && n <= 120) {
      candidates.push(n);
    }
  }
  const reCm = /\(\s*(\d{2,3})\s*"\s*\)/i;
  const cm = t.match(reCm);
  if (cm) {
    const n = Number.parseInt(cm[1], 10);
    if (n >= 20 && n <= 120) {
      candidates.push(n);
    }
  }
  const rePol = /(\d{2,3})\s*pollici/i;
  const pol = t.match(rePol);
  if (pol) {
    const n = Number.parseInt(pol[1], 10);
    if (n >= 20 && n <= 120) {
      candidates.push(n);
    }
  }
  if (!candidates.length) {
    return null;
  }
  return Math.max(...candidates);
}

export function extractTvInches(product: Product): number | null {
  return tvInchesFromText(fullText(product));
}

export function extractTvResolutionBucket(product: Product): string | null {
  const t = fullText(product).toUpperCase();
  if (/\b8K\b|\b7680\b/.test(t)) {
    return '8K';
  }
  if (/\b4K\b|\bUHD\b|\bULTRA HD\b|\b3840\b|\b2160\b/.test(t)) {
    return '4K / UHD';
  }
  if (/\bFULL HD\b|\b1920\b|\b1080\b|\bFHD\b/.test(t)) {
    return 'Full HD';
  }
  return null;
}

export function extractTvPanelBucket(product: Product): string | null {
  const t = fullText(product);
  if (/Neo\s+QLED|Mini\s*LED|MINILED/i.test(t)) {
    return 'Mini LED / Neo QLED';
  }
  if (/QD[\s-]*OLED|QD-OLED/i.test(t)) {
    return 'QD-OLED';
  }
  if (/\bOLED\b/i.test(t)) {
    return 'OLED';
  }
  if (/\bQLED\b/i.test(t)) {
    return 'QLED';
  }
  if (/\bLED\b/i.test(t)) {
    return 'LED';
  }
  return null;
}

export function extractPhoneRamGb(product: Product): number | null {
  const t = fullText(product);
  const m = t.match(/\bRAM\b[^\d]{0,40}(\d+)\s*GB/i);
  if (m) {
    return Number.parseInt(m[1], 10);
  }
  return null;
}

export function extractPhoneStorageGb(product: Product): number | null {
  const t = fullText(product);
  const m = t.match(/\bStorage\b[^\d]{0,40}(\d+)\s*GB/i);
  if (m) {
    return Number.parseInt(m[1], 10);
  }
  const m2 = t.match(/\bMemoria\s+interna\b[^\d]{0,40}(\d+)\s*GB/i);
  if (m2) {
    return Number.parseInt(m2[1], 10);
  }
  const name = product.name || '';
  const m3 = name.match(/(\d+)\s*GB\b/i);
  if (m3) {
    return Number.parseInt(m3[1], 10);
  }
  return null;
}

/** Diagonale in pollici (es. 6,1 → 6.1) se presente in scheda. */
export function extractPhoneDisplayInches(product: Product): number | null {
  const t = fullText(product);
  const m = t.match(/Dimensione\t([0-9]+[.,][0-9]+)\s*"/i);
  if (m) {
    return Number.parseFloat(m[1].replace(',', '.'));
  }
  const m2 = t.match(/\bDimensione\b[^\d]{0,20}([0-9]+[.,][0-9]+)\s*"/i);
  if (m2) {
    return Number.parseFloat(m2[1].replace(',', '.'));
  }
  return null;
}

export function extractApplianceType(product: Product): string | null {
  const t = fullText(product);
  const name = (product.name || '').toUpperCase();
  if (/LAVASTOVIGLIE|LAVASTOV/i.test(name + t)) {
    return 'Lavastoviglie';
  }
  if (/LAVATRICE/i.test(name + t)) {
    return 'Lavatrice';
  }
  if (/FRIGORIFERO|COMBINAT|CONGELATORE/i.test(name + t)) {
    return 'Frigorifero';
  }
  if (/FORNO|MICROONDE/i.test(name + t)) {
    return 'Forno / microonde';
  }
  return null;
}

export function extractEnergyClass(product: Product): string | null {
  const t = fullText(product);
  const patterns = [
    /Classe\s+energetica[:\s\t]+([A-G](?:\+)?)/i,
    /Classe\s+efficienza\s+energetica[:\s\t]+([A-G](?:\+)?)/i,
    /Classe\s+energetica\s*:\s*([A-G](?:\+)?)/i
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      return m[1].toUpperCase();
    }
  }
  return null;
}

export function extractApplianceCapacityLabel(product: Product): string | null {
  const t = fullText(product);
  const mKg = t.match(/Capacit[aà][^\d]{0,40}(\d+)\s*kg/i);
  if (mKg) {
    return `${mKg[1]} kg`;
  }
  const mL = t.match(/Capacit[aà]\s+totale\s+(\d+)\s*litri/i);
  if (mL) {
    return `${mL[1]} L`;
  }
  const mC = t.match(/Numero\s+coperti[^\d]{0,20}(\d+)/i);
  if (mC) {
    return `${mC[1]} coperti`;
  }
  return null;
}

export function storageGbLabel(gb: number): string {
  if (gb >= 1000 && gb % 1000 === 0) {
    return `${gb / 1000} TB`;
  }
  if (gb >= 1000) {
    const tb = gb / 1000;
    const rounded = Math.round(tb * 10) / 10;
    return `${rounded} TB`;
  }
  return `${gb} GB`;
}
