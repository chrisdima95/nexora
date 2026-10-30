import { Directive, ElementRef, Input, OnInit, OnDestroy, inject, Renderer2 } from '@angular/core';

/**
 * Direttiva per lazy loading avanzato delle immagini usando IntersectionObserver
 * Migliora il caricamento delle immagini fuori viewport
 */
@Directive({
  selector: 'img[appLazyImage]',
  standalone: true
})
export class LazyImageDirective implements OnInit, OnDestroy {
  @Input() appLazyImage: string = '';
  @Input() rootMargin: string = '50px'; // Preload quando l'immagine è a 50px dal viewport

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private observer?: IntersectionObserver;
  private loaded = false;

  ngOnInit() {
    // Se l'immagine ha già loading="lazy", usa quello nativo
    const nativeImg = this.el.nativeElement as HTMLImageElement;
    if (nativeImg.loading === 'lazy') {
      // Usa lazy loading nativo se supportato
      if ('loading' in HTMLImageElement.prototype) {
        return;
      }
    }

    // Fallback: usa IntersectionObserver per browser che non supportano loading="lazy"
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.loaded) {
              this.loadImage();
              this.observer?.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: this.rootMargin,
          threshold: 0.01
        }
      );

      this.observer.observe(nativeImg);
    } else {
      // Fallback per browser molto vecchi: carica immediatamente
      this.loadImage();
    }
  }

  private loadImage() {
    if (this.loaded || !this.appLazyImage) return;

    const nativeImg = this.el.nativeElement as HTMLImageElement;
    
    // Aggiungi placeholder durante il caricamento
    this.renderer.setStyle(nativeImg, 'opacity', '0');
    this.renderer.setStyle(nativeImg, 'transition', 'opacity 0.3s ease');

    // Crea nuova immagine per preload
    const img = new Image();
    img.onload = () => {
      this.renderer.setAttribute(nativeImg, 'src', this.appLazyImage);
      this.renderer.setStyle(nativeImg, 'opacity', '1');
      this.loaded = true;
    };
    img.onerror = () => {
      // Gestisci errore caricamento
      this.renderer.setStyle(nativeImg, 'opacity', '1');
    };
    img.src = this.appLazyImage;
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
