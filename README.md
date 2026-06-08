# DoronX Smart Invoicing Dashboard

Angular 17 (NgModule, no standalone) dashboard for the DoronX Smart Invoicing SaaS platform.

## Quick start

```bash
npm install
ng serve
```

Open http://localhost:4200

## Production build

```bash
ng build --configuration=production
```

## Stack

- **Angular 17** — NgModules, lazy-loaded feature modules
- **Backend** — https://api.doronpay.com (live)
- **Auth** — Smart Invoicing JWT stored in localStorage
- **HTTP** — AuthInterceptor attaches `Authorization: Bearer <token>` to every request
- **Charts** — Chart.js (reports page)

## Modules

| Route | Module | Description |
|-------|--------|-------------|
| `/auth/login` | AuthModule | JWT login |
| `/auth/register` | AuthModule | 2-step workspace registration |
| `/dashboard` | DashboardModule | Overview stats + recent invoices |
| `/invoices` | InvoicesModule | List, create, detail |
| `/wallets` | WalletsModule | Connect business-owned receiving wallets |
| `/rates` | RatesModule | Trade pairs + live rate quotes |
| `/webhooks` | WebhooksModule | Event reference + callback docs |
| `/reports` | ReportsModule | Chart.js analytics |
| `/billing` | BillingModule | Plan info + API key |

## Environment

Set your API base in `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'https://api.doronpay.com',
  smartInvoicingPath: '/smart-invoicing'
};
```

## API endpoints integrated

- `POST /smart-invoicing/auth/register`
- `POST /smart-invoicing/auth/login`
- `GET/POST /smart-invoicing/wallet-profiles`
- `GET/POST /smart-invoicing/rates/trade-pairs`
- `POST /smart-invoicing/rates/refresh`
- `POST /smart-invoicing/rates/quote`
- `GET/POST /smart-invoicing/invoices`
- `GET /smart-invoicing/invoices/:id`
