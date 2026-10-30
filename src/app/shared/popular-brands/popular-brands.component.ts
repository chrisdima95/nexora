import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface PopularBrandItem {
  /** Testo mostrato nel tile */
  label: string;
  /** Valore del parametro API/query `brand` (es. "Apple") */
  brand: string;
  /** Breve hint per accessibilità */
  hint: string;
}

@Component({
  selector: 'app-popular-brands',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="popular-brands" aria-labelledby="popular-brands-heading">
      <div class="popular-brands__inner">
        <header class="popular-brands__header">
          <h2 id="popular-brands-heading" class="popular-brands__title">Marchi nel catalogo</h2>
          <p class="popular-brands__subtitle">
            Scegli un marchio per aprire la ricerca già filtrata.
          </p>
        </header>

        <ul class="popular-brands__grid" role="list">
          @for (item of brands; track item.brand) {
            <li class="popular-brands__cell">
              <a
                class="popular-brands__tile"
                [routerLink]="['/search']"
                [queryParams]="{ brand: item.brand }"
                [attr.aria-label]="item.hint"
              >
                <span class="popular-brands__mark" aria-hidden="true">{{ item.label.charAt(0) }}</span>
                <span class="popular-brands__label">{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .popular-brands {
        box-sizing: border-box;
        width: 100%;
        /* Ponte visivo tra offerte e guida: meno “secondo scaffale bianco” */
        background: linear-gradient(180deg, #ffffff 0%, #f9f9fa 45%, #ffffff 100%);
        border-top: 1px solid var(--home-divider, #ececec);
        padding: calc(var(--home-section-pt, 2.25rem) - 0.2rem) 0 var(--home-section-pb, 0.5rem);
      }

      .popular-brands__inner {
        box-sizing: border-box;
        max-width: var(--home-max-width, 1200px);
        margin: 0 auto;
        padding: 0 var(--home-gutter, 1.5rem) var(--home-inner-pb, 1.5rem);
      }

      .popular-brands__header {
        margin: 0 0 var(--home-header-mb, 1.25rem);
        max-width: 46rem;
      }

      .popular-brands__title {
        margin: 0 0 0.45rem;
        font-size: clamp(1.24rem, 2.28vw, 1.52rem);
        font-weight: 700;
        color: #1a1a1a;
        letter-spacing: -0.018em;
        line-height: 1.22;
      }

      .popular-brands__subtitle {
        margin: 0;
        font-size: var(--home-subtitle-size, 0.92rem);
        line-height: var(--home-subtitle-lh, 1.55);
        color: var(--home-subtitle-color, #5a5a5a);
        font-weight: 400;
      }

      .popular-brands__grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .popular-brands__cell {
        margin: 0;
        min-width: 0;
      }

      .popular-brands__tile {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 0.65rem;
        min-height: 3.25rem;
        padding: 0.65rem 0.85rem;
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.07);
        background: #ffffff;
        text-decoration: none;
        color: #1a1a1a;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.05);
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease,
          background 0.15s ease,
          transform 0.15s ease;
      }

      .popular-brands__tile:hover {
        border-color: rgba(0, 0, 0, 0.12);
        background: #fafafa;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06), 0 12px 28px rgba(0, 0, 0, 0.09);
        transform: translateY(-2px);
      }

      .popular-brands__tile:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }

      .popular-brands__mark {
        flex-shrink: 0;
        width: 2rem;
        height: 2rem;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: #333333;
        background: #ffffff;
        border: 1px solid #e8e8e8;
      }

      .popular-brands__label {
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @media (max-width: 1024px) {
        .popular-brands__grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.7rem;
        }
      }

      @media (max-width: 768px) {
        .popular-brands {
          padding: var(--home-section-pt-md, 1.5rem) 0 0.25rem;
        }

        .popular-brands__inner {
          padding: 0 var(--home-gutter-md, 1rem) var(--home-inner-pb-md, 1.25rem);
        }

        .popular-brands__header {
          margin-bottom: var(--home-header-mb-md, 1rem);
        }

        .popular-brands__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem;
        }

        .popular-brands__tile {
          min-height: 3.35rem;
        }
      }

      @media (max-width: 480px) {
        .popular-brands__inner {
          padding: 0 var(--home-gutter-sm, 0.75rem) var(--home-inner-pb-sm, 1rem);
        }

        .popular-brands__subtitle {
          font-size: var(--home-subtitle-size-sm, 0.88rem);
        }

        .popular-brands__tile {
          min-height: 3.15rem;
          padding: 0.55rem 0.75rem;
        }

        .popular-brands__mark {
          width: 1.85rem;
          height: 1.85rem;
          font-size: 0.88rem;
        }

        .popular-brands__label {
          font-size: 0.88rem;
        }
      }

      @media (max-width: 360px) {
        .popular-brands__grid {
          gap: 0.55rem;
        }

        .popular-brands__tile {
          padding: 0.5rem 0.65rem;
          gap: 0.55rem;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopularBrandsComponent {
  /**
   * Valori `brand` allineati al backend (migrazione + filtro `brand__iexact`).
   */
  /** Ordine per presenza a catalogo (conteggio reale DB); tutti i `brand` esistono lato API. */
  readonly brands: PopularBrandItem[] = [
    { label: 'Samsung', brand: 'Samsung', hint: 'Mostra solo prodotti Samsung' },
    { label: 'Apple', brand: 'Apple', hint: 'Mostra solo prodotti Apple' },
    { label: 'Motorola', brand: 'Motorola', hint: 'Mostra solo prodotti Motorola' },
    { label: 'OPPO', brand: 'OPPO', hint: 'Mostra solo prodotti OPPO' },
    { label: 'LG', brand: 'LG', hint: 'Mostra solo prodotti LG' },
    { label: 'Sony', brand: 'Sony', hint: 'Mostra solo prodotti Sony' },
    { label: 'Xiaomi', brand: 'Xiaomi', hint: 'Mostra solo prodotti Xiaomi' },
    { label: 'Electrolux', brand: 'Electrolux', hint: 'Mostra solo prodotti Electrolux' }
  ];
}
