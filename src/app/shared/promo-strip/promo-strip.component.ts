import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-promo-strip',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './promo-strip.component.html',
  styleUrl: './promo-strip.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoStripComponent {
  @Input() headline = 'Promozioni dal catalogo';
  @Input() subline = 'Anteprima in home; elenco completo nella pagina Offerte.';
  @Input() ctaLabel = 'Vai alle offerte';
  /** Route o array di segmenti compatibile con RouterLink */
  @Input() ctaLink: string | any[] = '/offerte';
}
