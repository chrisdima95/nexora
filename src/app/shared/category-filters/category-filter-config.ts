import type { CategoryFilterDefinition, CategoryFilterId } from './category-filter.types';

export const PRICE_FILTER_BUCKETS: { id: string; label: string; min: number; max: number }[] = [
  { id: 'lte499', label: 'Fino a 499 €', min: 0, max: 499.999 },
  { id: '500-999', label: '500 – 999 €', min: 500, max: 999.999 },
  { id: '1000-1999', label: '1.000 – 1.999 €', min: 1000, max: 1999.999 },
  { id: '2000-3499', label: '2.000 – 3.499 €', min: 2000, max: 3499.999 },
  { id: 'gte3500', label: '3.500 € e oltre', min: 3500, max: Number.POSITIVE_INFINITY }
];

export const CATEGORY_FILTER_DEFINITIONS: Record<CategoryFilterId, CategoryFilterDefinition> = {
  computer: {
    category: 'computer',
    controls: [
      { id: 'brand', label: 'Marca', kind: 'select', emptyLabel: 'Tutte le marche' },
      { id: 'price', label: 'Prezzo', kind: 'select', emptyLabel: 'Tutte le fasce' },
      { id: 'ram', label: 'RAM', kind: 'select', emptyLabel: 'Qualsiasi RAM' },
      { id: 'storage', label: 'Archiviazione', kind: 'select', emptyLabel: 'Qualsiasi archiviazione' },
      { id: 'processor', label: 'Famiglia processore', kind: 'select', emptyLabel: 'Qualsiasi processore' }
    ]
  },
  tv: {
    category: 'tv',
    controls: [
      { id: 'brand', label: 'Marca', kind: 'select', emptyLabel: 'Tutte le marche' },
      { id: 'price', label: 'Prezzo', kind: 'select', emptyLabel: 'Tutte le fasce' },
      { id: 'inches', label: 'Pollici', kind: 'select', emptyLabel: 'Qualsiasi diagonale' },
      { id: 'resolution', label: 'Risoluzione', kind: 'select', emptyLabel: 'Qualsiasi risoluzione' },
      { id: 'panel', label: 'Tecnologia display', kind: 'select', emptyLabel: 'Qualsiasi tecnologia' }
    ]
  },
  telefoni: {
    category: 'telefoni',
    controls: [
      { id: 'brand', label: 'Marca', kind: 'select', emptyLabel: 'Tutte le marche' },
      { id: 'price', label: 'Prezzo', kind: 'select', emptyLabel: 'Tutte le fasce' },
      { id: 'storage', label: 'Memoria interna', kind: 'select', emptyLabel: 'Qualsiasi memoria' },
      { id: 'ram', label: 'RAM', kind: 'select', emptyLabel: 'Qualsiasi RAM' },
      { id: 'display', label: 'Display (pollici)', kind: 'select', emptyLabel: 'Qualsiasi diagonale' }
    ]
  },
  elettrodomestici: {
    category: 'elettrodomestici',
    controls: [
      { id: 'brand', label: 'Marca', kind: 'select', emptyLabel: 'Tutte le marche' },
      { id: 'price', label: 'Prezzo', kind: 'select', emptyLabel: 'Tutte le fasce' },
      { id: 'tipo', label: 'Tipologia', kind: 'select', emptyLabel: 'Tutte le tipologie' },
      { id: 'energy', label: 'Classe energetica', kind: 'select', emptyLabel: 'Qualsiasi classe' },
      { id: 'capacity', label: 'Capacità', kind: 'select', emptyLabel: 'Qualsiasi capacità' }
    ]
  }
};
