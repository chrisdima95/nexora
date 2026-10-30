import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { Order } from '../../models/order.model';
import { OrderService } from '../../services/order.service';
import { CheckoutSuccessComponent } from './checkout-success.component';

describe('Checkout order confirmation', () => {
  let orders: jasmine.SpyObj<OrderService>;
  let response: Subject<Order>;
  let routeId: string | null;
  let platform: string;
  let originalHistoryState: unknown;
  const order: Order = {
    id: 4, order_number: 'ORD-CONFIRMATION', status: 'confirmed', total_amount: '2398.00',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', items: []
  };

  beforeEach(async () => {
    routeId = '4';
    platform = 'browser';
    originalHistoryState = window.history.state;
    window.history.replaceState(null, '');
    response = new Subject<Order>();
    orders = jasmine.createSpyObj<OrderService>('OrderService', ['getMyOrder']);
    orders.getMyOrder.and.returnValue(response.asObservable());
    await TestBed.configureTestingModule({
      imports: [CheckoutSuccessComponent],
      providers: [
        provideRouter([{ path: 'checkout/success/:id', component: CheckoutSuccessComponent }]),
        { provide: PLATFORM_ID, useFactory: () => platform },
        { provide: OrderService, useValue: orders }
      ]
    }).compileComponents();
  });

  afterEach(() => window.history.replaceState(originalHistoryState, ''));

  function mockRoute() {
    spyOnProperty(TestBed.inject(ActivatedRoute).snapshot, 'paramMap', 'get')
      .and.returnValue(convertToParamMap(routeId === null ? {} : { id: routeId }));
  }

  async function render() {
    mockRoute();
    const fixture = TestBed.createComponent(CheckoutSuccessComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture;
  }

  async function resolveOrder() {
    await Promise.resolve();
    response.next(order);
    response.complete();
  }

  it('renders a neutral SSR shell without reading browser history or requesting private data', () => {
    platform = 'server';
    mockRoute();
    const fixture = TestBed.createComponent(CheckoutSuccessComponent);
    const historyAccess = spyOnProperty(window, 'history', 'get').and.callThrough();
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(historyAccess).not.toHaveBeenCalled();
    expect(orders.getMyOrder).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Stiamo recuperando');
    expect(fixture.nativeElement.textContent).not.toContain('Ordine effettuato con successo');
  });

  it('shows the successful order after checkout while validating navigation state with the API', async () => {
    const harness = await RouterTestingHarness.create();
    harness.fixture.autoDetectChanges();
    await TestBed.inject(Router).navigateByUrl('/checkout/success/4', { state: { order } });
    await harness.fixture.whenStable();
    expect(orders.getMyOrder).toHaveBeenCalledOnceWith('4');
    await resolveOrder();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Ordine effettuato con successo');
    expect(harness.routeNativeElement?.textContent).toContain(order.order_number);
    expect(harness.routeNativeElement?.textContent).toContain('2.398,00');
  });

  it('updates the OnPush view after an asynchronous response on a direct URL', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.textContent).toContain('Stiamo recuperando');
    expect(orders.getMyOrder).toHaveBeenCalledOnceWith('4');
    await resolveOrder();
    // Do not force detectChanges: the component must schedule the view update itself.
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(order.order_number);
    expect(fixture.nativeElement.textContent).not.toContain('Stiamo recuperando');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('reloads the authoritative order even when browser history contains stale details', async () => {
    window.history.replaceState({ order: { ...order, total_amount: '1.00' } }, '');
    const fixture = await render();
    expect(fixture.componentInstance.order).toBeNull();
    expect(orders.getMyOrder).toHaveBeenCalledOnceWith('4');
    await resolveOrder();
    await fixture.whenStable();
    expect(fixture.componentInstance.order?.total_amount).toBe('2398.00');
    expect(fixture.nativeElement.textContent).toContain('2.398,00');
  });

  for (const status of [401, 403, 404, 500]) {
    it(`renders an asynchronous HTTP ${status} error without exposing a cached order or claiming success`, async () => {
      window.history.replaceState({ order }, '');
      const fixture = await render();
      await Promise.resolve();
      response.error(new HttpErrorResponse({ status }));
      await fixture.whenStable();
      const message = fixture.nativeElement.querySelector('[role="alert"]')?.textContent;
      expect(message).toContain(status === 401 || status === 403
        ? 'Effettua di nuovo il login'
        : status === 404 ? 'Ordine non trovato o non accessibile' : 'recuperare i dettagli');
      expect(fixture.nativeElement.textContent).not.toContain('Stiamo recuperando');
      expect(fixture.nativeElement.textContent).not.toContain('Ordine effettuato con successo');
      expect(fixture.nativeElement.textContent).not.toContain(order.order_number);
      expect(fixture.componentInstance.order).toBeNull();
    });
  }

  for (const id of [null, '0', 'invalid']) {
    it(`handles the invalid route ID ${id} without requesting an order`, async () => {
      routeId = id;
      const fixture = await render();
      expect(orders.getMyOrder).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Stiamo recuperando');
      expect(fixture.nativeElement.textContent).not.toContain('Ordine effettuato con successo');
    });
  }
});
