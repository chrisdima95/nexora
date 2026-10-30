import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  NgZone,
  afterNextRender,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface HeroSlide {
  imgSrc: string;
  imgAlt: string;
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaRoute: string;
}

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private autoplayPaused = false;
  private autoplayId: ReturnType<typeof setInterval> | null = null;

  /**
   * Solo le slide con indice in questo set montano un `<img src>` reale.
   * Le slide sono tutte nel viewport (stack assoluto): `loading="lazy"` sulle altre
   * non evita il download; così il primo paint non scarica 3–4 JPEG hero insieme.
   */
  readonly mediaReadySlides = signal<ReadonlySet<number>>(new Set([0]));

  readonly slides: HeroSlide[] = [
    {
      imgSrc: '/1_carousel.webp',
      imgAlt: 'Smartphone in promozione',
      kicker: 'Telefonia',
      title: 'Smartphone nel catalogo',
      subtitle: 'Apple, Samsung, OPPO e altri marchi presenti in listino.',
      ctaLabel: 'Vai alla telefonia',
      ctaRoute: '/telefoni',
    },
    {
      imgSrc: '/2_carousel.webp',
      imgAlt: 'TV Samsung QLED in evidenza',
      kicker: 'TV',
      title: 'TV Samsung in primo piano',
      subtitle: 'Linea QLED e Smart TV per uso quotidiano, sport e gaming.',
      ctaLabel: 'Apri la categoria TV',
      ctaRoute: '/tv',
    },
    {
      imgSrc: '/3_carousel.webp',
      imgAlt: 'Lavatrice Electrolux',
      kicker: 'Elettrodomestici',
      title: 'Cucina e lavanderia',
      subtitle: 'Lavatrici, lavastoviglie e grandi elettrodomestici in catalogo.',
      ctaLabel: 'Vedi elettrodomestici',
      ctaRoute: '/elettrodomestici',
    },
    {
      imgSrc: '/4_carousel.webp',
      imgAlt: 'Promozioni tech',
      kicker: 'Offerte',
      title: 'Articoli in promozione',
      subtitle: 'Selezione in sconto; il dettaglio di tutte le promozioni è nella pagina Offerte.',
      ctaLabel: 'Vai alle offerte',
      ctaRoute: '/offerte',
    },
  ];

  readonly currentIndex = signal(0);

  constructor() {
    // setInterval keeps Zone pending tasks open and blocks SSR stabilization.
    // Autoplay runs only in the browser after hydration.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Dopo il primo frame: precarica solo la slide adiacente per l’autoplay, senza il resto del set.
    afterNextRender(() => {
      if (this.slides.length > 1) {
        this.ensureSlideMediaReady(1);
      }
    });

    const intervalMs = 9000;
    // Fuori da Angular Zone: evita task periodici "pending" che bloccano `isStable()`
    // durante hydration, ma rientra in zone quando aggiorniamo lo stato UI.
    this.ngZone.runOutsideAngular(() => {
      this.autoplayId = setInterval(() => {
        if (!this.autoplayPaused) {
          this.ngZone.run(() => this.next());
        }
      }, intervalMs);
    });
    this.destroyRef.onDestroy(() => {
      if (this.autoplayId !== null) {
        clearInterval(this.autoplayId);
      }
    });
  }

  private ensureSlideMediaReady(index: number): void {
    this.mediaReadySlides.update((prev) => {
      if (prev.has(index)) {
        return prev;
      }
      return new Set(prev).add(index);
    });
  }

  @HostListener('mouseenter')
  onHeroMouseEnter(): void {
    this.autoplayPaused = true;
  }

  @HostListener('mouseleave')
  onHeroMouseLeave(): void {
    this.autoplayPaused = false;
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }

  next(): void {
    this.currentIndex.update((i) => {
      const n = (i + 1) % this.slides.length;
      this.ensureSlideMediaReady(n);
      return n;
    });
  }

  prev(): void {
    this.currentIndex.update((i) => {
      const n = (i - 1 + this.slides.length) % this.slides.length;
      this.ensureSlideMediaReady(n);
      return n;
    });
  }

  goTo(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.ensureSlideMediaReady(index);
      this.currentIndex.set(index);
    }
  }
}
