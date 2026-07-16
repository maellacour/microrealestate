# CLAUDE.md — Context for Claude Code

This file provides context for Claude Code to assist with development of **MicroRealEstate** (MRE), a self-hosted property/rent management application.

---

## Behavioral Guidelines

> These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### 4. Git Commits

- Never add a `Co-Authored-By: Claude` trailer to commit messages.

### 5. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## Project Overview

**MicroRealEstate** helps landlords manage properties, tenants, leases and rent payments. It is a **Docker-composed microservice application** with two Next.js frontends (landlord + tenant), an Express/MongoDB backend split across several services, and a Node CLI (`mre`) that orchestrates the compose files.

This checkout is the **`maellacour` fork** (`git@github.com:maellacour/microrealestate.git`), tracking upstream `microrealestate/microrealestate`. Work happens on `develop`; `main` is the PR target. The fork publishes its own images to `ghcr.io/maellacour/microrealestate/*` — see the Docker section, this matters.

Data is multi-tenant by **realm** (an organization). Almost every collection carries a `realmId`, and almost every API request carries an `organizationId` header. Keep this isolation intact — it is the security boundary.

---

## Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Monorepo | Yarn 3 workspaces (`yarn@3.3.0`) | Workspaces: `cli`, `e2e`, `services/*`, `webapps/*`, `types` |
| Runtime | Node.js 20 (`engines: v20`) | Distroless Docker images |
| Backend | Express 4 + Mongoose 6 | ESM everywhere (`"type": "module"`) |
| Database | MongoDB 7 | Data volume in `./data/mongodb` |
| Cache / sessions | Redis 7.4 | Refresh tokens, OTP, app credentials |
| Types | TypeScript 5.5 (`types` workspace) | Newer services are TS; `api`/`authenticator`/`emailer`/`pdfgenerator` are still JS |
| Landlord UI | Next.js 14 **pages router**, React 18 | MobX store, Tailwind + shadcn/radix, **plus legacy MUI v4** |
| Tenant UI | Next.js 14 **app router**, React 18, TS | Tailwind + shadcn/radix, `react-hook-form` + zod |
| Landlord state | `mobx` 6 + `mobx-react-lite` | Class stores, no Redux |
| Forms | `formik` + `yup` (landlord), `react-hook-form` + `zod` (tenant) | Don't mix them |
| i18n | `next-translate` (landlord), custom `utils/i18n` (tenant), `i18n` pkg (services) | Locales: `en`, `fr-FR`, `de-DE`, `pt-BR`, `es-CO` |
| PDF | `puppeteer`/chromium + `ejs` templates (pdfgenerator), `@react-pdf-viewer` (landlord) | |
| Email | `nodemailer` / Mailgun / Gmail, `ejs` templates | |
| Storage | Backblaze B2 via `aws-sdk` (S3 API) | Uploaded documents |
| Charts | `recharts` (landlord) | |
| Dates/money | `moment` (services + landlord), `date-fns` (tenant) | |
| Tests | Jest (api, common, cli), Cypress (`e2e`) | Coverage is thin — mostly rent computation |
| Tooling | ESLint 8, Prettier 3, Husky + lint-staged | |

---

## Architecture

```
microrealestate/
├── cli/                    # `mre` CLI — wraps docker compose, generates/validates .env
├── base.env / .env         # Env template + local env (ports, secrets, URLs)
├── docker-compose*.yml     # Prod (root), microservices.{base,dev,prod,test,ci}, monitoring
├── types/src/              # @microrealestate/types — shared TS types
│   ├── common/collections.ts   # Realm, Tenant, Lease, Property, Document…
│   └── api/tenant/             # tenantapi request/response contracts
├── services/
│   ├── common/src/         # @microrealestate/common — the shared backend lib
│   │   ├── collections/    # Mongoose models: account, document, email, lease,
│   │   │                   #   property, realm, template, tenant
│   │   └── utils/          # service.ts (bootstrap), environmentconfig, middlewares,
│   │                       #   mongoclient, redisclient, crypto, logger, serviceerror
│   ├── gateway/            # TS — reverse proxy, CORS, health aggregation (port 8080)
│   ├── authenticator/      # JS — signin/signup/refresh/OTP/appcredz (port 8000)
│   ├── api/                # JS — landlord REST API (port 8200)
│   │   ├── routes.js       # All landlord routes
│   │   ├── managers/       # realm, occupant(=tenant), property, lease, rent,
│   │   │                   #   accounting, dashboard, email, contract, frontdata
│   │   └── businesslogic/tasks/  # Ordered rent computation pipeline (1_base → 7_total)
│   ├── tenantapi/          # TS — tenant REST API (port 8250)
│   ├── pdfgenerator/       # JS — documents/templates, chromium (port 8300)
│   ├── emailer/            # JS — email parts: data/contents/recipients/attachments (port 8400)
│   └── resetservice/       # TS — wipes DBs; DEV/CI only, never exposed in prod
└── webapps/
    ├── commonui/           # Shared React components + the locale files
    ├── landlord/src/       # Next pages router
    │   ├── pages/[organization]/...  # dashboard, rents, tenants, properties,
    │   │                             #   accounting, settings/*
    │   ├── store/          # MobX: Store.js + Rent, Tenant, Property, Lease,
    │   │                   #   Document, Template, Dashboard, Accounting, User,
    │   │                   #   Organization, AppHistory
    │   ├── components/     # ui/ (shadcn) + domain folders (rents, tenants, properties…)
    │   ├── hooks/          # useFillStore, useFormatNumber, usePaymentTypes, useTimeout
    │   └── utils/          # fetch.js (axios instance), restcalls.js
    └── tenant/src/         # Next app router, TS
        └── app/[lang]/{(signin),(restricted)}/...
```

---

## Request Path

Everything goes through the **gateway** (`:8080`). Nothing else is exposed publicly.

| Public path | Proxied to | Notes |
|---|---|---|
| `/landlord` | landlord frontend | `LANDLORD_BASE_PATH` |
| `/tenant` | tenant frontend | `TENANT_BASE_PATH` |
| `/api/v2/authenticator/*` | authenticator | prefix stripped |
| `/api/v2/documents/*`, `/api/v2/templates/*` | pdfgenerator | `/api/v2` stripped |
| `/api/v2/*` | api (landlord) | `/api/v2` stripped |
| `/tenantapi/*` | tenantapi | prefix stripped |
| `/api/reset` | resetservice | **non-production only** |
| `/health` | fan-out to every service's `/health` | |

Landlord API routes (`services/api/src/routes.js`) are all guarded by:
`Middlewares.needAccessToken(ACCESS_TOKEN_SECRET)` → `Middlewares.checkOrganization()` → `Middlewares.notRoles(['tenant'])`.

Route groups: `/realms`, `/dashboard`, `/leases`, `/tenants` (backed by **occupantmanager**), `/rents`, `/properties`, `/accounting`, `/emails`.

**Naming trap:** the domain calls them *tenants*, the code often calls them *occupants* (`occupantmanager.js`), and "tenant" *also* means the tenant-facing app and its API. Read carefully before assuming.

---

## Data Model (MongoDB / Mongoose)

Models live in `services/common/src/collections/`, typed in `types/src/common/collections.ts`.

| Collection | Key fields |
|---|---|
| **Realm** | `name`, `members[]` (name/email/role/registered), `applications[]` (M2M clientId/clientSecret), `addresses[]`, `bankInfo`, `contacts[]`, `isCompany` + `companyInfo`, `thirdParties` (gmail/smtp/mailgun/b2 — secrets encrypted), `locale`, `currency` |
| **Account** | `firstname`, `lastname`, `email`, `password` (bcrypt), `createdDate` — the landlord login |
| **Tenant** (occupant) | `realmId`, `name`, company/legal fields, `contacts[]`, `reference`, `leaseId`, `beginDate`/`endDate`/`terminationDate`, `properties[]` (propertyId + embedded snapshot + `rent` + `expenses[]` + entry/exit dates), `rents` (computed map), `isVat`/`vatRatio`, `discount`, `guaranty`, `stepperMode` |
| **Lease** | `realmId`, `name`, `description`, `numberOfTerms`, `timeRange` (`days`\|`weeks`\|`months`\|`years`), `active`, `stepperMode` |
| **Property** | `realmId`, `type`, `name`, `surface`, `phone`, `digicode`, `address`, `price` |
| **Document** | `realmId`, `tenantId`, `leaseId`, `templateId`, `type` (`text`\|`file`), `contents`/`html` (text) or `url`/`mimeType`/`versionId` (file) |
| **Template** | `realmId`, `name`, `type` (`text`\|`fileDescriptor`), `contents`, `html`, `linkedResourceIds`, `required` |
| **Email** | `templateName`, `recordId`, `params`, `sentTo`, `sentDate`, `status`, `emailId` — the send log |

**`Tenant.properties[]` embeds a snapshot of the property** alongside the reference. Changing property shape means thinking about both.

### Rent computation

`services/api/src/businesslogic/tasks/` runs as an **ordered pipeline** — the numeric prefixes are the execution order, not decoration:

`1_base` → `2_debts` → `3_discounts` → `4_vats` → `5_balance` → `6_payments` → `7_total`

Rents are stored per-term on the tenant (`rents`) and recomputed from the lease + payments. This is the most business-critical and most test-covered code in the repo (`services/api/src/__tests__/computeRent.test..js` — note the double dot in the filename). **Change it only with tests.**

---

## Auth Flow

**Landlord:** email/password → `authenticator/landlord/signin` → access token (JWT, short-lived, kept in memory / MobX `User` store) + refresh token (httpOnly cookie, Redis-backed). Requests carry `Authorization: Bearer` + an `organizationId` header. The same endpoint also accepts **application credentials** (`clientId`/`clientSecret` from `Realm.applications`) for M2M.

**Tenant:** passwordless — email → OTP / magic link (Redis, sent via emailer) → session cookie. Tenant emails come from the contacts set in the landlord app. Tenants are blocked from the landlord API by `Middlewares.notRoles(['tenant'])`.

Token secrets are three separate env vars: `AUTHENTICATOR_ACCESS_TOKEN_SECRET`, `AUTHENTICATOR_REFRESH_TOKEN_SECRET`, `AUTHENTICATOR_RESET_TOKEN_SECRET`. Third-party secrets in `Realm.thirdParties` are encrypted with `CIPHER_KEY` / `CIPHER_IV_KEY` (`common/utils/crypto.ts`).

---

## Key Conventions

- **Every service bootstraps identically** — `Service.getInstance(new EnvironmentConfig({...}))` then `service.init({ name, onStartUp })` then `service.startUp()`. Copy an existing service's `index.js` rather than inventing a shape.
- **Env is declared, not read ad hoc** — every `process.env` var a service uses is listed in its `EnvironmentConfig`; read it back via `Service.getInstance().envConfig.getValues()`.
- **All backend imports are ESM with explicit `.js` extensions**, including from TS sources (`./utils/service.js`). This is required — don't drop the extension.
- **Shared code goes through `@microrealestate/common` / `@microrealestate/types`**, never a relative path across workspaces.
- **`realmId` on every query.** A query without it is a cross-organization data leak.
- **Async routes are wrapped** — `Middlewares.asyncWrapper(handler)`. Errors are `ServiceError(message, status)`.
- **Landlord state is MobX** — class stores under `src/store`, hydrated server-side via `useFillStore`; fetching lives in the store, not in components.
- **Landlord UI is mid-migration** — new components use Tailwind + `components/ui` (shadcn); MUI v4 remains in older screens. Prefer shadcn for new work; don't mass-convert existing screens.
- **Landlord forms = formik + yup; tenant forms = react-hook-form + zod.** Follow the app you're in.
- **Money and dates** — `moment` in services and landlord, `date-fns` in tenant. Amounts are plain numbers; formatting goes through `useFormatNumber` / `utils/numberformat.js`.
- **Locale strings** live in `webapps/commonui/locales/<locale>/` (frontends) and `services/*/src/locales/` (emails, API messages). Regenerate with `yarn workspace @microrealestate/landlord run generateStrings`.
- **Nothing runs outside Docker.** Services resolve each other by container name (`http://api:8200`), so `node src/index.js` on the host will not work.

---

## Docker & Images (fork-specific)

Compose files layer: `docker-compose.microservices.base.yml` (shared definitions) + `.dev.yml` / `.prod.yml` / `.test.yml`. `docker-compose.yml` at the root is the **self-hosting** file consumed by end users.

- `docker-compose.microservices.base.yml` pulls **`ghcr.io/maellacour/microrealestate/*`** — the fork's images.
- `docker-compose.yml` (self-host) still pulls **`ghcr.io/microrealestate/microrealestate/*`** — upstream.

The fork carries schema changes upstream doesn't have, so **mixing the two registries silently drops fields** (see CHANGELOG: "All services now consistently use fork images"). If you touch image references, keep every service on one registry.

Ports: gateway `8080`, authenticator `8000`, api `8200`, tenantapi `8250`, pdfgenerator `8300`, emailer `8400`, mongo `27017`, redis `6379`. Debug ports `9225`–`9240` (see VS Code "Docker: Attach to …" configs).

---

## Running the Project

```bash
# Install deps (Yarn 3 workspaces)
yarn

# DEV — hot reload, logs in console, resetservice enabled
yarn dev

# Build images
yarn build

# CI mode (no logs; needs `yarn build` first)
yarn ci

# PROD mode
yarn start

# Stop everything
yarn stop

# CLI directly (status, showconfig, configure, dumpdb, restoredb)
yarn mre status
yarn mre configure     # regenerate .env prompts; keeps existing secrets
yarn mre dumpdb
yarn mre restoredb

# Tests
yarn workspace @microrealestate/api run test     # Jest (needs --experimental-vm-modules, already wired)
yarn workspace @microrealestate/common run test
yarn e2e:ci      # Cypress headless, app must be running in CI mode
yarn e2e:run     # Cypress with browser
yarn e2e:open    # Cypress UI

# Lint / format (all workspaces)
yarn lint
yarn format
```

Dev URLs: `http://localhost:8080/landlord` and `http://localhost:8080/tenant`.

**`yarn lint` transpiles first** (`npm-run-all transpile eslint`) — a lint failure may actually be a TS build error in `types` or `common`. Read the output.

---

## Gotchas

- **`types` and `common` must be built before anything that imports them.** The `dev` scripts handle this (`clean` → `transpile` → parallel watches); a bare `next dev` or `node` will not.
- Mongo 7 is **not** compatible with pre-1.0.0-alpha.1 databases — `mre dumpdb`, wipe `data/mongodb`, `mre restoredb`.
- `resetservice` is gated on `!config.PRODUCTION` in the gateway. Keep it that way.
- The landlord app has both `date-fns` and `moment` installed; existing code overwhelmingly uses `moment`.
- Husky + lint-staged run eslint/prettier on commit. Don't fight the formatter — run `yarn format`.
- Changelog entries go under `## [Unreleased]` in `CHANGELOG.md` (Keep a Changelog format). This fork keeps it current; add to it for user-visible changes.
