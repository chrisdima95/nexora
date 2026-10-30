import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ProductAccordionSectionComponent } from '../../shared/product-accordion-section/product-accordion-section.component';
import { technicalSpecLineToDetailRow, type TechnicalSpecDetailRow } from '../../services/product-ui';

@Component({
  selector: 'app-product-detail-sections',
  standalone: true,
  imports: [ProductAccordionSectionComponent],
  templateUrl: './product-detail-sections.component.html',
  styleUrl: './product-detail-sections.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailSectionsComponent {
  readonly descriptionParagraphs = input.required<string[]>();
  readonly technicalSpecsLines = input.required<string[]>();

  readonly technicalSpecRows = computed((): TechnicalSpecDetailRow[] =>
    this.technicalSpecsLines().map((line) => technicalSpecLineToDetailRow(line))
  );
}
