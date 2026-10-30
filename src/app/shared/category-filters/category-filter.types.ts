export type CategoryFilterId = 'computer' | 'tv' | 'telefoni' | 'elettrodomestici';

export type FilterControlKind = 'select';

export interface FilterControlDef {
  id: string;
  label: string;
  kind: FilterControlKind;
  /** Opzione vuota (tutti) */
  emptyLabel: string;
}

export interface CategoryFilterDefinition {
  category: CategoryFilterId;
  controls: FilterControlDef[];
}

export interface CategoryFilterSelection {
  [controlId: string]: string;
}
