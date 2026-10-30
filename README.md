# Nexora

Demo e-commerce full stack sviluppata come progetto didattico/stage, con frontend Angular e backend Django REST.  
L'obiettivo del repository è mostrare un'implementazione coerente e presentabile di flussi catalogo, ricerca, dettaglio prodotto e carrello.

## Stack

- Frontend: Angular 21, TypeScript, RxJS, Angular SSR, Service Worker
- Backend: Django 6, Django REST Framework
- Setup di sviluppo: proxy Angular verso backend locale (`/api` -> `http://127.0.0.1:8000`)
- Storage dati demo: SQLite locale (`backend/db.sqlite3`)

## Funzionalità implementate

- Catalogo per categorie (`tv`, `telefoni`, `elettrodomestici`, `computer`)
- Pagina offerte con ordinamenti e gestione prodotti in promozione
- Ricerca prodotti con filtro backend e stato UI robusto (`loading`, `empty`, `error`)
- Dettaglio prodotto con validazione route (`invalid-route` vs `not-found`)
- Carrello con dedup, quantità, subtotale/totale e persistenza `localStorage`
- Disponibilità prodotto (`in_stock`, `low_stock`, `out_of_stock`) con blocco add-to-cart quando esaurito
- Error handling migliorato lato API/frontend (incluso timeout richieste)

## Architettura (sintesi)

- `src/app/pages`: pagine principali e route lazy
- `src/app/services`: integrazione API, logica carrello, autenticazione demo
- `src/app/layout` e `src/app/shared`: componenti UI riusabili/layout
- `backend/api`: modelli, serializer, viewset e filtri DRF
- `backend/config`: configurazione Django e URL root

## Avvio locale

### 1) Frontend Angular

```bash
npm install
npm run start -- --proxy-config proxy.conf.json
```

App disponibile su `http://localhost:4200`.

### 2) Backend Django (in terminale separato)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API disponibile su `http://127.0.0.1:8000`.

## API prodotti

Endpoint principali:

- `GET /api/ping/` -> health check
- `GET /api/products/` -> lista prodotti
- `GET /api/products/{id}/` -> dettaglio prodotto

Filtri supportati da `/api/products/`:

- base: `category`, `brand`, `search`
- promozioni/home: `on_sale`, `featured`, `exclude_featured`, `exclude_on_sale`
- ordinamento/range: `ordering`, `recent`, `min_price`, `max_price`, `limit`

Note tecniche:

- endpoint prodotti in sola lettura (`GET/HEAD/OPTIONS`)
- contratto prodotto allineato tra DRF e frontend Angular
- in SSR il frontend usa base URL server-side locale, in browser usa `/api` via proxy

## Cosa è stato realizzato a livello tecnico

- Aggiornamento controllato da Angular 19 a 21, con allineamento di CLI, builder e SSR e build resa stabile in ambiente locale
- Rafforzamento del contratto dati prodotto (normalizzazione/validazione payload)
- Miglioramento gestione errori asincroni e timeout rete
- Ordinamento e disponibilità prodotto allineati end-to-end
- Ottimizzazione pragmatica asset statici (riduzione peso immagini homepage)

## Limiti attuali

- Progetto demo: nessun pagamento reale
- Autenticazione dimostrativa gestita lato frontend (`localStorage`), non ancora integrata con un flusso auth backend reale
- Nessun sistema CI/CD configurato in repository
- Nessuna persistenza utenti/ordini di produzione

## Scelta sul database demo

Il file `backend/db.sqlite3` viene mantenuto intenzionalmente nel progetto come database demo locale.

- Scopo: rendere Nexora subito eseguibile in locale anche in contesto portfolio/stage, senza setup dati iniziale complesso.
- Operatività: dopo modifiche ai modelli o nuove migration, eseguire `python manage.py migrate`.
- Contesto: è una scelta pragmatica per demo tecnica e valutazione progetto, non una soluzione di produzione.

## Struttura repository (essenziale)

```text
nexora/
  backend/                 # Django + DRF
  public/                  # asset statici frontend
  scripts/                 # utility di pulizia/audit locale
  src/                     # applicazione Angular
  proxy.conf.json          # proxy /api in sviluppo
  angular.json
  package.json
```

## Sviluppi futuri possibili

- autenticazione reale backend (session/token)
- test automatici più estesi (frontend + API)
- endpoint ordini/checkout persistente
- deployment dimostrativo frontend/backend

## Troubleshooting locale

- **Backend non avviato**: se il frontend mostra errori su chiamate API, verificare che Django sia in esecuzione su `http://127.0.0.1:8000`.
- **Proxy `/api` non raggiungibile**: avviare Angular con `npm run start -- --proxy-config proxy.conf.json`.
- **Schema DB non allineato**: dopo migration nuove o pull aggiornati, eseguire `python manage.py migrate` in `backend/`.
- **Errori dopo modifiche strutturali frontend**: fermare e riavviare il dev server Angular per riallineare compilazione/hot reload.

## Note

Repository didattico orientato a portfolio/stage: priorità a chiarezza tecnica, coerenza del codice e riproducibilità locale.
