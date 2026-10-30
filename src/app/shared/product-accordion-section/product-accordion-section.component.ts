import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  signal
} from '@angular/core';

@Component({
  selector: 'app-product-accordion-section',
  standalone: true,
  templateUrl: './product-accordion-section.component.html',
  styleUrl: './product-accordion-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductAccordionSectionComponent implements OnInit {
  /** Prefisso univoco per id accessibili (es. "product-desc", "product-specs"). */
  readonly accordionId = input.required<string>();
  readonly title = input.required<string>();
  readonly initiallyOpen = input(false);
  /**
   * `card`: contenitore bianco con raggio/ombra (default, per riuso futuro).
   * `flat`: sezione integrata nel fondo pagina (solo product detail).
   */
  readonly appearance = input<'card' | 'flat'>('card');

  protected readonly expanded = signal(false);

  protected readonly headerElementId = computed(
    () => `${this.accordionId()}-header`
  );
  protected readonly panelElementId = computed(
    () => `${this.accordionId()}-panel`
  );

  ngOnInit(): void {
    this.expanded.set(this.initiallyOpen());
  }

  protected toggle(): void {
    this.expanded.update((v) => !v);
  }
}
