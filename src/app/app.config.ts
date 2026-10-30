import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { IMAGE_CONFIG } from '@angular/common';
import { provideServiceWorker } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { CriticalRoutesPreloadStrategy } from './strategies/critical-routes-preload.strategy';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(
      routes,
      withPreloading(CriticalRoutesPreloadStrategy),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    ), 
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return firstValueFrom(authService.initializeAuthState());
    }),
    provideClientHydration(withEventReplay()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true
      }
    }
  ]
};
