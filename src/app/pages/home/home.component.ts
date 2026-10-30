import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  OnInit,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CarouselComponent } from "../../carousel/carousel.component";
import { Card, CardsComponent } from '../../cards/cards.component';
import { PromoStripComponent } from '../../shared/promo-strip/promo-strip.component';
import { PopularBrandsComponent } from '../../shared/popular-brands/popular-brands.component';
import { StoreServicesComponent } from '../../shared/store-services/store-services.component';

import { ApiService, Product } from '../../services/api.service';
import { buildListErrorMessage } from '../../services/api-error';
import {
  catalogListingCategorySlugFromProduct,
  productToCatalogCard
} from '../../services/product-ui';
import {
  pickDiverseProducts,
  sortProductsBySaleDiscountDesc
} from '../../services/home-product-selection';

/** Più candidati dall’API per offerte/novità, poi selezione diversificata lato client (vetrina più equilibrata). */
const HOME_PRODUCT_SECTION_LIMIT = 6;
const HOME_PRODUCT_FETCH_LIMIT = 18;

/** Costante dedicata: evita falsi positivi del language service ("RouterLink is not used" con @if / control flow). */
const HOME_STANDALONE_IMPORTS = [
  CarouselComponent,
  PromoStripComponent,
  PopularBrandsComponent,
  StoreServicesComponent,
  CardsComponent,
  RouterLink
] as const;

@Component({
  selector: 'app-home',
  imports: [...HOME_STANDALONE_IMPORTS],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {

  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  /** Placeholder count per skeleton griglia prodotti (allineato al limite card in home). */
  readonly homeProductSkeletonSlots = [0, 1, 2, 3, 4, 5] as const;

  featuredLoading = true;
  featuredError = false;
  featuredErrorMessage = '';
  featuredCards: Card[] = [];

  /** Sezione “Offerte del momento”: `on_sale` + exclude_featured (home) per non duplicare “in evidenza”; /offerte non usa exclude_featured. */
  offersLoading = true;
  offersError = false;
  offersErrorMessage = '';
  offersCards: Card[] = [];

  /**
   * Novità: ultimi inseriti (`recent`), esclusi in evidenza e in promozione per distinguere le altre fasce home.
   */
  newArrivalsLoading = true;
  newArrivalsError = false;
  newArrivalsErrorMessage = '';
  newArrivalsCards: Card[] = [];

  categoryCards: Card[] = [
    {
      id: 'home-cat-tv',
      link: ['/tv'],
      imgSrc: '/card-tv.webp',
      imgAlt: 'Area televisori: modelli OLED, QLED e LED',
      title: 'TV',
      description: 'Schermi OLED, QLED e LED per film, sport e gaming.',
      buttonText: 'Scopri i TV',
      imgWidth: 480,
      imgHeight: 300
    },
    {
      id: 'home-cat-elettrodomestici',
      link: ['/elettrodomestici'],
      imgSrc: '/card-elettrodomestici.jpg',
      imgAlt: 'Area elettrodomestici per cucina e lavanderia',
      title: 'Elettrodomestici',
      description: 'Grandi e piccoli elettrodomestici per cucina e lavanderia.',
      buttonText: 'Vedi elettrodomestici',
      imgWidth: 480,
      imgHeight: 300
    },
    {
      id: 'home-cat-telefoni',
      link: ['/telefoni'],
      imgSrc: '/card-iphone.jpg',
      imgAlt: 'Area telefonia e smartphone',
      title: 'Telefoni',
      description: 'Smartphone e accessori: Android, iOS e vari marchi in listino.',
      buttonText: 'Vai ai telefoni',
      imgWidth: 480,
      imgHeight: 300
    }
  ];

  ngOnInit(): void {
    // SSR: non forzare `loading=false` senza dati — il markup deve coincidere col client iniziale
    // (`loading=true` + skeleton) per evitare errori di hydration che lasciano le sezioni “bloccate”.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.api
      .getProducts({ featured: true, purchasable: true, limit: HOME_PRODUCT_SECTION_LIMIT })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (data: Product[]) => {
        const curated = pickDiverseProducts(data, HOME_PRODUCT_SECTION_LIMIT, {
          maxPerCategory: 3,
          maxPerBrand: 2
        });
        this.featuredCards = curated.map((p) =>
          productToCatalogCard(p, {
            idPrefix: 'home-featured-',
            categoryListingFrom: catalogListingCategorySlugFromProduct(p.category)
          })
        );
        this.featuredLoading = false;
        this.featuredError = false;
        this.featuredErrorMessage = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Errore caricamento prodotti in evidenza:', err);
        this.featuredCards = [];
        this.featuredLoading = false;
        this.featuredError = true;
        this.featuredErrorMessage = buildListErrorMessage('la sezione In evidenza', err);
        this.cdr.markForCheck();
      }
    });

    this.api
      .getProducts({
        on_sale: true,
        exclude_featured: true,
        purchasable: true,
        limit: HOME_PRODUCT_FETCH_LIMIT
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (data: Product[]) => {
        const ranked = sortProductsBySaleDiscountDesc(data);
        const curated = pickDiverseProducts(ranked, HOME_PRODUCT_SECTION_LIMIT, {
          maxPerCategory: 3,
          maxPerBrand: 2
        });
        this.offersCards = curated.map((p) =>
          productToCatalogCard(p, {
            idPrefix: 'home-offers-',
            categoryListingFrom: catalogListingCategorySlugFromProduct(p.category)
          })
        );
        this.offersLoading = false;
        this.offersError = false;
        this.offersErrorMessage = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Errore caricamento offerte del momento:', err);
        this.offersCards = [];
        this.offersLoading = false;
        this.offersError = true;
        this.offersErrorMessage = buildListErrorMessage('la sezione Offerte del momento', err);
        this.cdr.markForCheck();
      }
    });

    this.api
      .getProducts({
        recent: true,
        exclude_featured: true,
        exclude_on_sale: true,
        limit: HOME_PRODUCT_FETCH_LIMIT
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: Product[]) => {
          const curated = pickDiverseProducts(data, HOME_PRODUCT_SECTION_LIMIT, {
            maxPerCategory: 3,
            maxPerBrand: 2
          });
          this.newArrivalsCards = curated.map((p) =>
            productToCatalogCard(p, {
              idPrefix: 'home-new-',
              categoryListingFrom: catalogListingCategorySlugFromProduct(p.category)
            })
          );
          this.newArrivalsLoading = false;
          this.newArrivalsError = false;
          this.newArrivalsErrorMessage = '';
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Errore caricamento novità:', err);
          this.newArrivalsCards = [];
          this.newArrivalsLoading = false;
          this.newArrivalsError = true;
          this.newArrivalsErrorMessage = buildListErrorMessage('la sezione Novita', err);
          this.cdr.markForCheck();
        }
      });
  }
}
