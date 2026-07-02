<div align="center">
  <img src="public/logo.svg" alt="Logo" width="96" height="96">

  <h1>E-commerce Template — Frontend</h1>

  <p><strong>Production-ready React storefront. Customer SPA + Admin panel. Multi-currency, multi-language, payment-ready.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=fff" alt="React 19">
    <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=fff" alt="TypeScript">
    <img src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=fff" alt="Vite">
    <img src="https://img.shields.io/badge/TanStack_Query-5-ff4154?logo=reactquery&logoColor=fff" alt="TanStack Query">
    <img src="https://img.shields.io/badge/Zustand-5-433e38" alt="Zustand">
    <img src="https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=fff" alt="Playwright">
    <img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT">
  </p>
</div>

---

> **Note** — this repository is a **single-commit snapshot** of a working e-commerce frontend. The full pre-snapshot history (feature branches, ADRs, code reviews) lived in a private monorepo and is not preserved here on purpose. Treat this as a clean starting point.

This template is paired with **[template-eccomerce-backend](https://github.com/elchale/template-eccomerce-backend)** (Django + DRF). They are designed to be deployed independently — frontend on Vercel/Cloudflare Pages/Netlify, backend on any container host.

---

## What you get

A **full storefront** wired end-to-end:

- **Customer side** — Home, Shop, Category, Search, Product Detail, Cart, Checkout (with embedded Izipay/Lyra card form), Order list, Order detail, Wishlist, Profile, Auth (login / register / forgot / reset / Google OAuth)
- **Admin panel** — Dashboard, Analytics, Product CRUD with variants + images, Category CRUD, Order management, Coupon CRUD, Marketing (banners / promos / popups / theme), all gated by `is_staff`
- **Auth** — JWT access tokens (in-memory) + refresh tokens (httpOnly cookie), allauth-compatible flows, email verification, password reset with action freezing
- **i18n** — Spanish (default), English, Portuguese; per-namespace lazy loading; `Accept-Language` sent on every request so the Django backend returns the right locale
- **Theming** — three-tier CSS variable system (primitives → semantic → component); dark mode via `[data-theme="dark"]` attribute; pre-paint script in `<head>` to avoid theme flash
- **State** — Zustand for client state (auth, modal, theme, marketing), TanStack Query for server state with language-scoped cache keys
- **Cookie consent** — first-visit banner; analytics gated by consent
- **Security** — strict CSP in `vercel.json`, input sanitization helpers, client-side rate limiter for auth endpoints, JWT redaction in logs
- **A11y** — semantic landmarks, skip-link, focus rings, `aria-label` on icon-only buttons, viewport-tested at 390 / 768 / 1280

## Tech stack

| Layer         | Choice                                                         |
| ------------- | -------------------------------------------------------------- |
| Framework     | React 19 + TypeScript 5.7                                      |
| Build         | Vite 6 (with project references for app + e2e tsconfigs)       |
| Routing       | React Router v7                                                |
| Server state  | TanStack Query 5 (30 s stale, no retry on 401/403)             |
| Client state  | Zustand 5 (split `State` + `Actions` interfaces, no devtools)  |
| HTTP          | Axios with request/response interceptors (token + refresh)     |
| Forms         | react-hook-form + zod                                          |
| Styling       | CSS Modules + 3-tier CSS variables (no Tailwind, no CSS-in-JS) |
| i18n          | react-i18next + http-backend (lazy JSON namespaces)            |
| Notifications | react-hot-toast                                                |
| Charts        | chart.js + react-chartjs-2 (admin analytics only)              |
| Payments      | `@lyracom/embedded-form-glue` (Izipay)                         |
| Errors        | `@sentry/react` (no-op when DSN empty)                         |
| Unit tests    | Vitest + @testing-library/react + MSW                          |
| E2E tests     | Playwright (3 viewports: 390 / 768 / 1280)                     |
| Linting       | ESLint 9 (flat config) + Stylelint + Prettier + Knip           |

## Project layout

```
src/
├── api/                  TanStack Query hooks  (one file per domain)
│   ├── useAuth.ts       login / register / refresh / OAuth
│   ├── useCart.ts       cart + checkout
│   ├── useOrders.ts
│   ├── useProducts.ts
│   ├── useAdmin*.ts     admin CRUD endpoints
│   └── index.ts         barrel
├── components/
│   ├── ui/              Button, Modal, Input, Skeleton, Toast, …
│   ├── forms/           form-aware wrappers (Input, Select, FileUpload, …)
│   ├── layout/          Header, Footer, Sidebar, AdminLayout
│   ├── modals/          ModalBase + domain modals
│   ├── payments/        Izipay embedded form integration
│   └── features/        page-level feature blocks
├── constants/           routes, query keys, storage keys
├── hooks/               utility hooks (no API calls)
├── lib/                 axios, queryClient, i18n, logger, rateLimiter, sanitize
├── pages/               route-level components (no barrel)
│   ├── Home, ShopHome, CategoryPage, ProductDetailPage, SearchPage
│   ├── CartPage, CheckoutPage, CheckoutPaymentPage
│   ├── OrderListPage, OrderDetailPage, WishlistPage, Profile
│   ├── PrivacyPage, TermsPage, NotFound, Main (layout route)
│   ├── admin/   Dashboard, Analytics, ProductList/Form, OrderList/Detail,
│   │            CategoryList, CouponList, Marketing, Theme
│   └── auth/    Login, Register, ForgotPassword, ResetPassword, VerifyEmail
├── stores/              Zustand stores (auth, modal, theme, marketing, cart UI)
├── styles/               global CSS, variables.css (3-tier color system)
├── types/                domain types, organized by file (no barrel)
└── test-setup.ts         vitest global setup
e2e/                      Playwright specs (smoke + template-hardening)
scripts/                  diagnostic tooling (count-requests.mjs)
```

## Getting started

### Prerequisites

- Node.js 20+
- A running instance of the [eccomerce backend](https://github.com/elchale/template-eccomerce-backend) (or any DRF backend that matches the API contract — see backend repo for the OpenAPI schema at `/api/schema/`)

### Install + run

```bash
npm install
cp .env.example .env       # then edit VITE_API_URL
npm run dev                # http://localhost:5174 (strict port)
```

The backend is expected at `VITE_API_URL` (e.g. `http://localhost:8000`). Leave it blank to use Vite's dev proxy (forwards `/api`, `/auth`, `/static`, `/media`, `/admin`, `/ws` to `VITE_BACKEND_PROXY_TARGET`, defaulting to `http://127.0.0.1:8000`).

### Environment variables

| Variable                    | Required            | Purpose                                                                    |
| --------------------------- | ------------------- | -------------------------------------------------------------------------- |
| `VITE_PROJECT_NAME`         | yes                 | App name (rendered in `<title>` and footer)                                |
| `VITE_API_URL`              | prod only           | Absolute backend origin in production. Dev: leave empty to use Vite proxy. |
| `VITE_BACKEND_PROXY_TARGET` | no                  | Override the dev-proxy target (default `http://127.0.0.1:8000`)            |
| `VITE_GOOGLE_CLIENT_ID`     | optional            | Enables Google OAuth login                                                 |
| `VITE_IZIPAY_PUBLIC_KEY`    | optional (checkout) | Public key for the embedded Izipay/Lyra card form                          |
| `VITE_SENTRY_DSN`           | optional            | Enables `@sentry/react`; if empty, Sentry is a no-op (zero bundle cost)    |

## Scripts

```bash
npm run dev               # vite dev server (port 5174 strict)
npm run build             # tsc -b && vite build
npm run preview           # serve the production build locally

npm run typecheck         # tsc -b --noEmit (app + e2e project refs)
npm run lint              # eslint . (flat config)
npm run lint:fix
npm run stylelint         # stylelint src/**/*.css
npm run format            # prettier --write .
npm run format:check
npm run knip              # detect unused files / exports / deps

npm test                  # vitest run
npm run test:watch
npm run test:ui
npm run test:coverage

npm run e2e               # playwright test (auto-starts vite dev)
npm run e2e:headed
npm run e2e:ui
npm run e2e:report

npm run audit:deps        # npm audit --omit=dev --audit-level=high

npm run validate          # parallel: typecheck + lint + stylelint + format:check + knip + test
npm run validate:ci       # serial: + build
npm run validate:full     # serial: + e2e
```

## Architecture highlights

### Auth: split-storage JWT

Access tokens live **in memory + localStorage** (for SPA-side cache). Refresh tokens live in an **httpOnly cookie** set by the backend, so XSS can't steal them. The axios response interceptor catches 401s, hits `/auth/token/refresh/` with `withCredentials: true`, and replays the original request. Stale localStorage (left over from an old session) is detected on boot and silently cleared without redirecting anonymous visitors to the login page.

### Query key factories with language scope

Every consumer query key ends in `getLang()` (read once from `localStorage.lang`), so switching languages doesn't return cached ES content under EN. Admin queries are language-agnostic (they return all locales for editing).

```ts
const KEYS = {
  all: (lang: string) => ['products', lang] as const,
  detail: (id: string, lang: string) => [...KEYS.all(lang), 'detail', id] as const,
};
```

### 3-tier color system

```css
/* 1. Primitives — never used directly in components */
--gray-50: #fafafa;
--blue-600: #2563eb;

/* 2. Semantic — what components reference */
--color-bg: var(--gray-50);
--color-primary: var(--blue-600);

/* 3. Component — only when a value repeats 3+ times */
--button-primary-bg: var(--color-primary);

[data-theme='dark'] {
  --color-bg: #0a0a0a;
  /* primitives stay the same, only semantic remaps */
}
```

A small `theme-prepaint.js` runs in `<head>` before React mounts, reading the persisted theme from localStorage and setting `data-theme` immediately — no flash of incorrect colours.

### Strict CSP

The CSP in `vercel.json` ships with explicit allowlists for the API host, Google OAuth, Izipay (TEST + PROD endpoints), and GCS for product images. `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. There is **no `unsafe-eval`** and `unsafe-inline` is restricted to styles only (required by react-helmet-async).

### Diagnostic: count-requests.mjs

`scripts/count-requests.mjs` is a Playwright harness that opens any URL in headless Chromium, captures every request the browser fires, and prints a categorized summary (API vs Vite modules vs assets) with timing, status, and duplicate-request flags. Useful for verifying production network behaviour:

```bash
TARGET_URL=https://yoursite.com node scripts/count-requests.mjs
TARGET_URL=https://yoursite.com node scripts/count-requests.mjs --stale  # seeds localStorage like a returning visitor
```

## Testing strategy

| Layer                 | Tool                     | Where                                              |
| --------------------- | ------------------------ | -------------------------------------------------- |
| Unit + component      | Vitest + RTL + MSW       | `src/**/__tests__/*.test.ts(x)`                    |
| Integration (network) | MSW handlers             | `src/test-setup.ts` registers them                 |
| E2E (browser)         | Playwright (3 viewports) | `e2e/smoke.spec.ts` + `template-hardening.spec.ts` |

E2E specs **mock the backend via `page.route`** — they verify React rendering, not backend connectivity. This means CI can run them without spinning up the Django stack.

## CI

`.github/workflows/ci.yml` runs on every push and PR:

| Job        | Blocks merge?                                                 |
| ---------- | ------------------------------------------------------------- |
| typecheck  | yes                                                           |
| lint       | yes                                                           |
| stylelint  | yes                                                           |
| prettier   | yes                                                           |
| knip       | yes                                                           |
| vitest     | yes                                                           |
| vite build | yes                                                           |
| playwright | no (informational — network flakes shouldn't block)           |
| npm audit  | no (informational — transient CVE advisories shouldn't block) |
| commitlint | yes on PRs, n/a on pushes (conventional commits enforced)     |

`continue-on-error: true` jobs surface failures in the GitHub UI but don't fail the workflow — the policy used by most production teams.

## Deployment

The `vercel.json` is a complete config for Vercel:

- `npm run build` → `dist/`
- SPA rewrite (everything except `/sitemap.xml` falls through to `/`)
- Sitemap rewrite to the backend's `/sitemap.xml` (change the destination to your backend host)
- Security headers: CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy
- 1-year immutable cache on `/assets/*`

For any other static host (Cloudflare Pages, Netlify, S3+CloudFront), point it at `dist/` and replicate the redirect + header rules.

## Coding conventions

- **Named exports only**. No `export default`.
- **Path aliases** — always `@/`, never `../../..`. Exception: colocated files (`./Component.module.css`).
- **Barrels** in `components/ui`, `components/forms`, `components/modals`, `components/layout`, `hooks`, `api`, `stores`, `constants`. **Not** in `pages`, `types`, `lib`.
- **API hooks** (with TanStack Query) go in `api/`. **Utility hooks** (no API) go in `hooks/`.
- **Zustand stores** split `State` and `Actions` interfaces; `Store = State & Actions`.
- **CSS Modules** only. No inline `style={}`, no CSS-in-JS, no Tailwind.
- **Imports order**: external → `@/` absolute → relative.

## License

MIT — use this as a starting point for any project, commercial or otherwise.

## Maintained by

This template is built and maintained by **[Qolca](https://www.qolca.org)** — a software & AI automation studio in Lima, Peru. We use it as the foundation for client storefronts.

- Don't want to self-host? We run it for you: **[managed store from $10/month](https://www.qolca.org/solutions/self-hosted-ecommerce-template)** ([español](https://www.qolca.org/es/soluciones/plantilla-ecommerce-autohospedada) · [português](https://www.qolca.org/pt/solucoes/modelo-ecommerce-auto-hospedado))
- More automation guides on the [Qolca blog](https://www.qolca.org/blog)
