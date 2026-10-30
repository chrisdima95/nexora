import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type { Product } from '../../services/api.service';
import { CATEGORY_FILTER_DEFINITIONS } from './category-filter-config';
import type { CategoryFilterId, CategoryFilterSelection } from './category-filter.types';
import { applyCategoryProductFilters, buildSelectOptionsForControl } from './category-filter-options';
import type { SelectOption } from './category-filter-options';

@Component({
  selector: 'app-category-product-filters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-product-filters.component.html',
  styleUrl: './category-product-filters.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryProductFiltersComponent implements OnChanges {
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  @Input({ required: true }) category!: CategoryFilterId;
  @Input({ required: true }) products: Product[] = [];

  @Output() filteredChange = new EventEmitter<Product[]>();

  drawerOpen = false;
  selection: CategoryFilterSelection = {};
  filtered: Product[] = [];
  /** Etichette dei filtri attualmente applicati (desktop + drawer). */
  activeSummaries: { controlId: string; groupLabel: string; valueLabel: string }[] = [];

  defs = CATEGORY_FILTER_DEFINITIONS;

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(ev: KeyboardEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (ev.key !== 'Escape' || !this.drawerOpen) return;
    ev.preventDefault();
    this.closeDrawer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products'] || changes['category']) {
      this.selection = {};
      this.emitFiltered();
    }
  }

  optionsFor(controlId: string): SelectOption[] {
    return buildSelectOptionsForControl(this.category, controlId, this.products || []);
  }

  controlValue(controlId: string): string {
    return this.selection[controlId] ?? '';
  }

  onSelect(controlId: string, value: string): void {
    this.selection = { ...this.selection, [controlId]: value };
    this.emitFiltered();
  }

  reset(): void {
    this.selection = {};
    this.emitFiltered();
  }

  clearFilter(controlId: string): void {
    this.onSelect(controlId, '');
  }

  openDrawer(): void {
    this.drawerOpen = true;
    this.cdr.markForCheck();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.cdr.markForCheck();
  }

  activeFilterCount(): number {
    return Object.values(this.selection).filter((v) => (v || '').trim()).length;
  }

  private emitFiltered(): void {
    const source = this.products || [];
    this.filtered = applyCategoryProductFilters(this.category, source, this.selection);
    this.activeSummaries = this.buildActiveSummaries();
    this.filteredChange.emit(this.filtered);
    this.cdr.markForCheck();
  }

  private buildActiveSummaries(): { controlId: string; groupLabel: string; valueLabel: string }[] {
    const def = this.defs[this.category];
    if (!def) return [];
    const out: { controlId: string; groupLabel: string; valueLabel: string }[] = [];
    for (const c of def.controls) {
      const raw = this.selection[c.id] ?? '';
      const v = raw.trim();
      if (!v) continue;
      const opts = this.optionsFor(c.id);
      const opt = opts.find((o) => o.value === v);
      out.push({
        controlId: c.id,
        groupLabel: c.label,
        valueLabel: opt?.label ?? v
      });
    }
    return out;
  }
}
