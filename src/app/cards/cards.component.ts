import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { ButtonComponent } from '../shared/button/button.component'; 

import { CartService } from '../services/cart.service';
import { availabilityLabel, canAddToCart } from '../services/product-availability';

export interface Card {
  id?: string; // ID univoco per tracking ottimizzato
  productId?: number;
  link: string[];
  imgSrc: string;
  imgAlt: string;
  title: string;
  /** Righe sintetiche da `technical_specs` (pagine categoria catalogo). */
  keyHighlights?: string[];
  description?: string;
  buttonText?: string;
  detailsLinkText?: string;
  price?: string;
  originalPrice?: string; // Prezzo originale (se c'è uno sconto)
  discountPercentage?: number; // Percentuale di sconto
  availabilityStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  imgWidth?: number; // Larghezza immagine
  imgHeight?: number; // Altezza immagine
}

@Component({
  selector: 'app-cards',
  standalone: true,
  imports: [RouterModule, ButtonComponent],
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class CardsComponent {
  @Input() cards: Card[] = [];
  /** 'product': griglia catalogo (default). 'category': tile homepage più compatte e da navigazione. */
  @Input() mode: 'product' | 'category' = 'product';
  showModal: boolean = false;
  lastAddedProduct: Card | null = null;

  constructor(
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  canAdd(card: Card): boolean {
    return card.availabilityStatus ? canAddToCart({ availability_status: card.availabilityStatus }) : true;
  }

  getAvailabilityLabel(card: Card): string | null {
    if (!card.availabilityStatus) {
      return null;
    }
    return availabilityLabel(card.availabilityStatus);
  }

  addToCart(card: Card) {
    if (!this.canAdd(card) || !card.productId) {
      return;
    }
    // Usa il prezzo scontato se disponibile, altrimenti il prezzo normale
    const priceToUse = card.price || card.originalPrice;
    if (priceToUse) {
      this.cartService.addToCart({
        productId: card.productId,
        title: card.title,
        unitPrice: this.parsePrice(priceToUse),
        imgSrc: card.imgSrc,
        imgAlt: card.imgAlt
      });
      this.lastAddedProduct = card;
      this.showModal = true;
      this.cdr.markForCheck();
    }
  }

  closeModal() {
    this.showModal = false;
    this.cdr.markForCheck();
  }

  goToCart() {
    this.closeModal();
    this.router.navigate(['/carrello']);
  }

  continueShopping() {
    this.closeModal();
  }

  private parsePrice(value: string): number {
    const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
