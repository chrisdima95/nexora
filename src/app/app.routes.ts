import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { NotauthGuard } from './guards/notauth.guard';

export const routes: Routes = [
    {path: '', redirectTo: 'home', pathMatch: 'full'},
    {path: 'home', component: HomeComponent},
    {
        path: 'tv', 
        loadComponent: () => import('./pages/tv/tv.component').then(m => m.TvComponent)
    },
    {
        path: 'elettrodomestici', 
        loadComponent: () => import('./pages/elettrodomestici/elettrodomestici.component').then(m => m.ElettrodomesticiComponent)
    },
    {
        path: 'computer',
        loadComponent: () => import('./pages/computer').then((m) => m.ComputerComponent)
    },
    { path: 'telefonia', redirectTo: 'telefoni', pathMatch: 'full' },
    {
        path: 'telefoni', 
        loadComponent: () => import('./pages/telefoni/telefoni.component').then(m => m.TelefoniComponent)
    },
    { path: 'sconti', redirectTo: 'offerte', pathMatch: 'full' },
    {
        path: 'offerte',
        loadComponent: () => import('./pages/sconti/sconti.component').then(m => m.ScontiComponent)
    },
    {
        path: 'products/:id',
        loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
    },
    {
        path: 'search',
        loadComponent: () => import('./pages/search-results/search-results.component').then(m => m.SearchResultsComponent)
    },
    {
        path: 'login', 
        canActivate: [NotauthGuard],
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'account',
        canActivate: [AuthGuard],
        loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent)
    },
    {
        path: 'carrello', 
        loadComponent: () => import('./pages/carrello/carrello.component').then(m => m.CarrelloComponent)
    },
    {
        path: 'checkout', 
        loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent)
    },
    {
        path: 'checkout/review',
        loadComponent: () => import('./pages/checkout-review/checkout-review.component').then(m => m.CheckoutReviewComponent)
    },
    {
        path: 'checkout/success/:id',
        loadComponent: () => import('./pages/checkout-success/checkout-success.component').then(m => m.CheckoutSuccessComponent)
    },
    {
        path: '**', 
        loadComponent: () => import('./pages/notfound/notfound.component').then(m => m.NotfoundComponent)
    },
];
