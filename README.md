# Nexora

## Presentazione

Nexora è un e-commerce full-stack sviluppato nell'ambito del percorso ITS Web Developer. Integra un frontend Angular con un backend Django REST Framework per gestire catalogo, autenticazione e ordini persistenti.

Il progetto è una demo locale e un portfolio tecnico: permette di esplorare il flusso dal catalogo allo storico degli ordini, senza effettuare pagamenti reali.

## Tecnologie utilizzate

| Area | Tecnologie |
| --- | --- |
| Frontend | Angular 21, TypeScript, RxJS, HTML e CSS, Angular SSR, Angular Service Worker |
| Backend | Python, Django 6.0.1, Django REST Framework 3.16.1, django-cors-headers |
| Database | SQLite per lo sviluppo e la demo locale |
| Autenticazione | Utenti Django e Django REST Framework Simple JWT 5.5.1 |
| Sviluppo e test | Git, GitHub, Visual Studio Code, npm, test Django/DRF, Jasmine e Karma |

Le dipendenze sono definite in [package.json](package.json), [package-lock.json](package-lock.json) e [backend/requirements.txt](backend/requirements.txt).

## Funzionalità implementate

- Catalogo per categorie: telefoni, TV, elettrodomestici e computer.
- Ricerca testuale, filtri per marca, categoria, prezzo e disponibilità; ordinamenti e selezioni per la homepage.
- Dettaglio prodotto con immagini, descrizione, caratteristiche tecniche e disponibilità; pagina delle offerte.
- Carrello con aggiunta, rimozione, aggiornamento quantità, deduplicazione e persistenza nel `localStorage`.
- Registrazione di utenti Django, validazione e hashing delle password, login con username e password.
- Autenticazione JWT con access token, refresh token, invio dell'header `Authorization: Bearer` e tentativo di rinnovo dopo una risposta `401`.
- Checkout riservato agli utenti autenticati: accesso e registrazione conducono al riepilogo conservando il carrello.
- Creazione e salvataggio di ordini e righe d'ordine, associati all'utente autenticato; storico personale con dettagli degli articoli.
- Calcolo di prezzi e totale dell'ordine sul backend, controllo e decremento delle scorte nella stessa transazione del salvataggio.
- Rifiuto di prodotti esauriti o quantità eccessive, con messaggi nel checkout e conservazione del carrello in caso di errore.

## Architettura

Angular gestisce interfaccia, navigazione e stato del carrello. I servizi `ApiService`, `AuthService` e `OrderService` comunicano con Django tramite `HttpClient`; un interceptor aggiunge i token JWT e gestisce il rinnovo dell'accesso.

Django REST Framework espone le API, valida le richieste, applica i permessi e persiste i dati. Lo storico è filtrato per utente anche sul backend. La richiesta di creazione ordine contiene soltanto ID prodotto e quantità: prezzi e totali vengono ricavati dal catalogo sul server.

In sviluppo, il browser usa `/api`, inoltrato a `http://127.0.0.1:8000` tramite [proxy.conf.json](proxy.conf.json). Durante il rendering SSR i servizi usano direttamente `http://127.0.0.1:8000/api`.

```text
nexora/
├── backend/
│   ├── api/
│   │   ├── fixtures/products_demo.json
│   │   ├── migrations/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   ├── config/
│   ├── manage.py
│   └── requirements.txt
├── public/
├── src/app/
│   ├── guards/
│   ├── interceptors/
│   ├── pages/
│   ├── services/
│   └── shared/
├── angular.json
├── package.json
├── package-lock.json
└── proxy.conf.json
```

## API REST

I percorsi sono definiti in [backend/api/urls.py](backend/api/urls.py) e montati sotto `/api/`.

| Metodo | Endpoint | Autenticazione richiesta | Funzione |
| --- | --- | --- | --- |
| GET | `/api/ping/` | No | Verifica disponibilità API |
| GET | `/api/products/` | No | Elenco prodotti e filtri |
| GET | `/api/products/{id}/` | No | Dettaglio prodotto |
| POST | `/api/auth/register/` | No | Creazione utente e profilo |
| POST | `/api/auth/login/` | No; richiede username e password | Restituisce access e refresh token |
| POST | `/api/auth/token/refresh/` | Richiede un refresh token valido nel corpo | Restituisce un nuovo access token |
| GET | `/api/auth/me/` | JWT | Dati dell'utente e del profilo |
| POST | `/api/orders/` | JWT | Creazione ordine e consumo delle scorte |
| GET | `/api/orders/` | JWT | Storico dell'utente autenticato |
| GET | `/api/orders/{id}/` | JWT | Dettaglio di un proprio ordine |

Gli endpoint prodotti sono in sola lettura (`GET`, `HEAD`, `OPTIONS`). Supportano `category`, `brand`, `search`, `min_price`, `max_price`, `ordering`, `on_sale`, `featured`, `exclude_featured`, `exclude_on_sale`, `purchasable`, `recent` e `limit`. Il catalogo è amministrabile tramite Django Admin.

La creazione ordine aggrega gli articoli duplicati e usa aggiornamenti condizionali delle scorte, compatibili con SQLite, all'interno di `transaction.atomic`. Se un articolo non è acquistabile, l'intera operazione viene annullata. Le risposte includono `400` per richieste non valide o prodotti inesistenti, `409` per disponibilità insufficiente e `503` con `Retry-After` in caso di contesa SQLite.

## Database e catalogo dimostrativo

Il file locale `backend/db.sqlite3` è escluso dal repository tramite `.gitignore`. La fixture [backend/api/fixtures/products_demo.json](backend/api/fixtures/products_demo.json) contiene **52 prodotti**:

- 25 telefoni;
- 11 TV;
- 6 elettrodomestici;
- 10 computer.

Le migrazioni creano lo schema e aggiornano eventuali prodotti preesistenti; non inseriscono il catalogo iniziale. La fixture conserva gli ID, i prezzi, le scorte, le descrizioni, le caratteristiche tecniche e i riferimenti alle immagini originali. Contiene esclusivamente prodotti: non distribuisce utenti, password, profili o ordini del database originale.

Con l'ambiente virtuale attivo, dalla cartella `backend`, dopo le migrazioni:

```powershell
python manage.py loaddata products_demo
```

Il caricamento è previsto su un **database dimostrativo nuovo**. Su un database già popolato può sovrascrivere prodotti con gli stessi ID, ripristinare le scorte della fixture e lasciare eventuali prodotti aggiuntivi. Alcuni riferimenti immagine storici sono risolti dal frontend tramite una mappa basata sugli ID; le immagini corrispondenti sono presenti in `public/`.

## Installazione e avvio locale

### Requisiti

- Windows 11 e PowerShell.
- Python **3.12 o successivo**, secondo il requisito di Django 6.0.1.
- Node.js e npm: il lockfile Angular richiede `^20.19.0 || ^22.12.0 || >=24.0.0`; ad esempio Node.js 22.x dalla versione 22.12.0.
- Git e connessione Internet per clonare il repository e installare le dipendenze.

### 1. Clonare il repository

```powershell
git clone https://github.com/chrisdima95/nexora.git
cd nexora
```

### 2. Preparare il backend

Dal terminale nella cartella principale:

```powershell
python --version
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

I comandi seguenti usano direttamente l'interprete dell'ambiente virtuale, senza richiederne l'attivazione. Generare una chiave casuale per la sessione di sviluppo, senza inserirla nel codice:

```powershell
$env:DJANGO_SECRET_KEY = & .\.venv\Scripts\python.exe -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

La variabile vale per la sessione PowerShell e va configurata nuovamente in un nuovo terminale backend. Un file `.env` non viene caricato automaticamente. La rigenerazione della chiave invalida i token JWT già emessi e richiede un nuovo login.

Creare il database locale, caricare il catalogo e avviare Django:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py loaddata products_demo
.\.venv\Scripts\python.exe manage.py runserver
```

Il controllo API è disponibile su [http://127.0.0.1:8000/api/ping/](http://127.0.0.1:8000/api/ping/). Lasciare questo terminale aperto.

### 3. Avviare il frontend

Aprire un secondo terminale PowerShell nella cartella principale `nexora`, dove si trova `package.json`:

```powershell
node --version
npm.cmd ci
npm.cmd run start -- --proxy-config proxy.conf.json
```

Su Windows viene usato `npm.cmd` per evitare il blocco di `npm.ps1` da parte della policy degli script PowerShell.

Aprire [http://localhost:4200](http://localhost:4200). Il catalogo è consultabile senza account; dalla pagina `/login` o dal checkout è possibile registrarsi e accedere. Non sono distribuite credenziali demo. Gli ordini confermati consumano le scorte del database locale.

Gli script principali disponibili sono `npm.cmd run start`, `npm.cmd run build` e `npm.cmd test`, definiti in `package.json`. Il proxy indicato sopra è necessario per le richieste API del browser in sviluppo.

## Test e verifiche

Le verifiche tecniche finali hanno prodotto i seguenti risultati:

- **15 test backend superati nella precedente verifica** su un database SQLite temporaneo separato: ordini validi, prodotti esauriti, quantità eccessive, duplicati, più articoli, input non validi e rollback anche in caso di errore di persistenza.
- Test concorrente su due richieste per l'ultima unità disponibile: una sola vendita confermata, senza stock negativo.
- Test backend del flusso registrazione, login JWT, refresh, creazione ordine e storico, con verifica dell'isolamento tra utenti.
- **Suite frontend completa: 80 test superati, 0 falliti, 0 saltati** in Chrome headless. Comprende 11 nuovi test della conferma ordine per SSR, navigazione dal checkout, aggiornamento asincrono della vista `OnPush`, stato di navigazione obsoleto, ID invalidi ed errori HTTP `401`, `403`, `404` e `500`.
- **Controlli TypeScript dell'applicazione e dei test superati**; compilazione Angular development superata.
- Catalogo riproducibile tramite fixture: migrazioni e caricamento su SQLite nuovo verificati, con confronto dei **52 prodotti**, API e risoluzione delle immagini.
- **Verifica end-to-end dei flussi principali superata**, con Angular e Django avviati contemporaneamente e Chrome headless reale: catalogo, categorie, ricerca, filtri, dettaglio prodotto, registrazione, login JWT, rinnovo token e logout.
- Carrello persistente, checkout autenticato, creazione e persistenza dell'ordine e storico con dettagli verificati nel browser e confrontati con il database temporaneo. Verificati decremento delle scorte, rollback dell'intera operazione per disponibilità insufficiente e conservazione del carrello dopo l'errore.
- Conferma ordine corretta e verificata dopo l'acquisto, con accesso diretto e ricaricamento: riepilogo aggiornato e rendering SSR senza `ReferenceError`. Verificati ordine inesistente e ordine di un altro utente (`404`), accesso anonimo (`401`) e assenza di eccezioni JavaScript bloccanti. I casi `403` e `500` sono coperti dai test del componente.

Le verifiche integrate hanno utilizzato esclusivamente utenti dimostrativi, un database SQLite temporaneo e una configurazione Django isolata; il database originale è rimasto invariato. SSR renderizza lo stato iniziale di caricamento della conferma; il riepilogo viene recuperato nel browser tramite l'API autenticata, che verifica la proprietà dell'ordine anche quando si arriva dal checkout.


**Build production Angular: completata correttamente il 30 ottobre 2026.**
Il comando `npm.cmd run build` ha generato i bundle frontend e SSR senza errori. È presente un warning non bloccante relativo al budget del bundle iniziale: 523,68 kB rispetto al limite configurato di 520 kB.


I test backend sono in [backend/api/tests.py](backend/api/tests.py). Da `backend`, con `DJANGO_SECRET_KEY` configurata:

```powershell
.\.venv\Scripts\python.exe manage.py test api
```

Django utilizza un database di test separato. Tra i test frontend del flusso di acquisto figurano [checkout.component.spec.ts](src/app/pages/checkout/checkout.component.spec.ts), [checkout-review.component.spec.ts](src/app/pages/checkout-review/checkout-review.component.spec.ts), [checkout-success.component.spec.ts](src/app/pages/checkout-success/checkout-success.component.spec.ts) e [auth.interceptor.spec.ts](src/app/interceptors/auth.interceptor.spec.ts).

Per eseguire la suite frontend completa, dalla cartella principale:

```powershell
npm.cmd test -- --watch=false --browsers=ChromeHeadless
```

Richiede Chrome installato. La suite completa è stata eseguita con la configurazione del repository, senza escludere test.

Non sono stati eseguiti test di carico elevato né verifiche su un deployment pubblico.

## Limitazioni

Nexora è una demo locale, non un'applicazione pronta per la produzione.

- Nessun pagamento reale: lo stato `confirmed` indica il salvataggio dell'ordine dimostrativo, non un addebito.
- Nessun deployment pubblico documentato nel repository e nessuna pipeline CI/CD configurata.
- SQLite serializza le scritture: con contesa prolungata il servizio può rispondere `503`, richiedendo un nuovo tentativo. Il checkout non implementa idempotenza per ritentativi dopo errori di rete.
- Access e refresh token sono conservati nel `localStorage`, con esposizione in caso di XSS. Il logout cancella lo stato locale senza revocare i token sul server; i refresh token non vengono ruotati. Recupero password non implementato.
- Configurazione Django di sviluppo con `DEBUG=True`; sicurezza e configurazione del deployment richiedono ulteriori interventi.
- Provenienza e licenze delle immagini e dei testi del catalogo da verificare prima di una distribuzione pubblica definitiva.

## Sviluppi futuri

- Integrare le verifiche end-to-end già eseguite in una suite ripetibile nel repository e nella futura pipeline CI/CD.
- Rafforzare gestione e revoca delle sessioni, protezioni contro abusi e configurazione di sicurezza.
- Containerizzare frontend e backend con Docker.
- Integrare una pipeline CI/CD e predisporre un deployment dimostrativo.
- Valutare PostgreSQL e test di carico per scenari con maggiore concorrenza.

## Contesto del progetto

Progetto formativo ITS Web Developer, pubblicato come portfolio tecnico per documentare competenze in Python, Django, API REST, modellazione dei dati, autenticazione e integrazione frontend-backend.
