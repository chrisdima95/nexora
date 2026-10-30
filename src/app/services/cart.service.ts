import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  id: string;
  productId: number;
  title: string;
  unitPrice: number;
  imgSrc: string;
  imgAlt: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private static readonly CART_STORAGE_KEY = 'nexoraCart';
  private platformId = inject(PLATFORM_ID);
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItems.asObservable();

  constructor() {
    this.cartItems.next(this.loadCartFromStorage());
  }

  addToCart(product: Omit<CartItem, 'quantity' | 'id'>) {
    const currentItems = [...this.cartItems.value];
    const existingItem = currentItems.find((item) => item.productId === product.productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      currentItems.push({
        ...product,
        id: this.toCartItemId(product.productId),
        quantity: 1
      });
    }

    this.setCartState(currentItems);
  }

  removeFromCart(itemId: string) {
    const currentItems = this.cartItems.value.filter((item) => item.id !== itemId);
    this.setCartState(currentItems);
  }

  updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(itemId);
      return;
    }

    const nextQuantity = Math.max(1, Math.floor(quantity));
    const currentItems = this.cartItems.value.map((item) =>
      item.id === itemId ? { ...item, quantity: nextQuantity } : item
    );
    this.setCartState(currentItems);
  }

  getCartItems(): CartItem[] {
    return this.cartItems.value;
  }

  getCartCount(): number {
    return this.cartItems.value.reduce((total, item) => total + item.quantity, 0);
  }

  getTotalPrice(): number {
    return this.cartItems.value.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  }

  getItemSubtotal(itemId: string): number {
    const item = this.cartItems.value.find((cartItem) => cartItem.id === itemId);
    if (!item) {
      return 0;
    }
    return item.unitPrice * item.quantity;
  }

  clearCart() {
    this.setCartState([]);
  }

  private toCartItemId(productId: number): string {
    return `product-${productId}`;
  }

  private parseUnitPrice(value: number | string): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const numeric = Number(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private sanitizeCartItems(items: unknown): CartItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    const sanitized: CartItem[] = [];
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }
      const entry = raw as Partial<CartItem>;
      const productId =
        typeof entry.productId === 'number'
          ? entry.productId
          : typeof entry.id === 'string' && entry.id.startsWith('product-')
            ? Number(entry.id.replace('product-', ''))
            : Number.NaN;
      if (!Number.isInteger(productId) || productId <= 0) {
        continue;
      }

      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      if (!title) {
        continue;
      }
      const quantity =
        typeof entry.quantity === 'number' && Number.isFinite(entry.quantity)
          ? Math.max(1, Math.floor(entry.quantity))
          : 1;
      const unitPrice = this.parseUnitPrice(
        (entry as { unitPrice?: number | string; price?: number | string }).unitPrice ??
          (entry as { price?: number | string }).price ??
          0
      );

      sanitized.push({
        id: this.toCartItemId(productId),
        productId,
        title,
        unitPrice,
        imgSrc: typeof entry.imgSrc === 'string' ? entry.imgSrc : '',
        imgAlt: typeof entry.imgAlt === 'string' ? entry.imgAlt : title,
        quantity
      });
    }

    return this.mergeDuplicates(sanitized);
  }

  private mergeDuplicates(items: CartItem[]): CartItem[] {
    const grouped = new Map<number, CartItem>();
    for (const item of items) {
      const existing = grouped.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        continue;
      }
      grouped.set(item.productId, { ...item });
    }
    return Array.from(grouped.values());
  }

  private loadCartFromStorage(): CartItem[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    const raw = localStorage.getItem(CartService.CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      return this.sanitizeCartItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  private saveCartToStorage(items: CartItem[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(CartService.CART_STORAGE_KEY, JSON.stringify(items));
  }

  private setCartState(items: CartItem[]): void {
    const normalized = this.mergeDuplicates(items).map((item) => ({
      ...item,
      id: this.toCartItemId(item.productId),
      quantity: Math.max(1, Math.floor(item.quantity))
    }));
    this.cartItems.next(normalized);
    this.saveCartToStorage(normalized);
  }
}
