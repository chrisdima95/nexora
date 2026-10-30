import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, timer, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/**
 * Strategia di preload personalizzata che preload solo le route critiche
 * dopo un breve delay per non interferire con il caricamento iniziale
 */
@Injectable({
  providedIn: 'root'
})
export class CriticalRoutesPreloadStrategy implements PreloadingStrategy {
  // Route critiche da preload con priorità
  private criticalRoutes = ['tv', 'elettrodomestici', 'telefoni', 'carrello'];

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    const routePath = route.path || '';
    
    // Preload per route critiche dopo un breve delay
    if (this.criticalRoutes.includes(routePath)) {
      // Delay di 2 secondi per non interferire con il caricamento iniziale
      return timer(2000).pipe(
        switchMap(() => load())
      );
    }
    
    // Nessun preload per altre route (lazy loading on-demand)
    return of(null);
  }
}
