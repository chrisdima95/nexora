import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { CreateOrderPayload, Order } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiBaseUrl = isPlatformServer(this.platformId) ? 'http://127.0.0.1:8000/api' : '/api';

  listMyOrders(): Observable<Order[]> {
    return this.http
      .get<Order[] | { results?: Order[] }>(`${this.apiBaseUrl}/orders/`)
      .pipe(map((response) => this.normalizeOrdersResponse(response)));
  }

  createOrder(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>(`${this.apiBaseUrl}/orders/`, payload);
  }

  getMyOrder(id: number | string): Observable<Order> {
    return this.http.get<Order>(`${this.apiBaseUrl}/orders/${id}/`);
  }

  private normalizeOrdersResponse(response: Order[] | { results?: Order[] }): Order[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.results)) {
      return response.results;
    }

    return [];
  }
}
