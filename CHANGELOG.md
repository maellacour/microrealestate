# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2.0.2] - 2026-09-11

### Fixed

- Completed the landlord image build fix started in 2.0.1. `next.config.js` reads the changelog at build time via `webapps/landlord/scripts/generatechangelog`, but the Dockerfile never copied the `scripts/` directory into the build stage, so `next build` still failed with `Cannot find module './scripts/generatechangelog'`. The scripts directory is now copied in, so the landlord image builds.

## [2.0.1] - 2026-09-11

### Changed

- The project is now named **Bayle** throughout: the README, the root package, the internal workspace scope (`@microrealestate/*` → `@bayle/*`) and the container image paths (`ghcr.io/maellacour/microrealestate/*` → `ghcr.io/maellacour/bayle/*`). This completes the distancing from upstream MicroRealEstate; Bayle remains MIT-licensed and credits the original in the README. The image path follows the GitHub repository name (CI publishes to `ghcr.io/${{ github.repository }}/*`), so the new path takes effect once the repository is renamed to `bayle`; dev and prod build locally and are unaffected in the meantime.

### Fixed

- The landlord Docker image could not copy `CHANGELOG.md` (read at build time for the What's new panel) because `.dockerignore` excluded every `.md` file; the changelog is now un-ignored.

## [2.0.0] - 2026-09-10

A major version for the rebrand rather than for a breaking change: the app is
renamed, relit and renavigated, and the fork now carries its own schema and its
own images. Nothing below requires a migration — upgrading from 1.8.0 needs no
action beyond pulling the new images.

### Added

- A **What's new** panel in the side menu, which reads this changelog: every release newest-first, the unreleased work labelled as such, and the version you are running marked as installed. A dot on the entry means the notes have changed since you last opened it — it compares a digest of the notes baked in at build time, so it keeps working while the top entry is still "Unreleased", and costs nothing to check. The notes themselves are a separate 35 kB chunk fetched the first time you open the panel, so the app shell grows by 2 kB for the whole feature. The changelog is written in English, so the panel is English in every language. Opening the panel redraws the Bayle seal beside its heading — the same mark the panel was opened from, its dashed ring then turning slowly while you read — and the releases rise into place one after another; both are disabled under `prefers-reduced-motion`.
- **Leases ending soon** on the dashboard, listing the tenancies whose lease ends within the next 90 days (soonest first, up to five), each a shortcut to the tenant. Dates within 30 days are highlighted, to help plan renewals and notice periods. It sits in the **Needs attention** panel alongside the unpaid rents.
- Colocation (shared rental) support. A dwelling can be managed as a **colocation**: several individual leases (one tenant per roommate) renting the same property, grouped together with a quote-part per roommate (manual %, default equal shares). A new **Colocation** tab on the property page shows the aggregated view (each roommate, their rent, their share), lets you set the shares and add/remove members. **Common charges** are entered once and split by quote-part into a **charge regularization for each roommate**, which then flows through the existing apply-to-a-term / share-with-tenant / PDF features. The per-property Results already sum a colocation's revenue correctly (each roommate lease references only the dwelling). Converting an existing "one property per room" setup is a history-safe procedure (the payment history lives on the lease): create the dwelling, repoint each room lease to it, then create the colocation.
- Charge regularization (_régularisation des charges_). A tenancy now has a charges regime — _provisions_ (reconciled once a year) or _forfait_ (flat fee, informative) — set in the Billing tab. For a provisions tenancy, a new **Charges** tab records the period's real recoverable charges as free lines (each flagged recoverable or not, so a charge outside the syndic statement such as electricity can be added by hand), over a freely chosen period pre-filled to the calendar year. It compares the provisions called over that period with the recoverable charges and shows the balance — a credit to the tenant (over-paid) or a complement due — and produces a **charge regularization statement** PDF that lists only the recoverable charges. Forfait tenancies keep their current behaviour and simply have the regularization disabled.
  - The balance can be **posted onto a rent term** (opt-in, per regularization): a complement due becomes a debt line, an over-payment a credit, on the term you choose; it can be unposted again. Editing/deleting is locked while posted.
  - A regularization can be **shared with the tenant**: once shared, it appears in the tenant app (recoverable lines, provisions called, and the resulting balance).

### Fixed

- The **Vacant / Rented** badge on a property was coloured the wrong way round: a vacant property was green and a rented one grey. For a landlord vacancy is the state that costs money, so a rented property is now green and a vacant one amber, in line with the paid/not-paid colours used everywhere else.
- Expense category labels showed the raw key (`expenseCategory.works`, `expenseCategory.other`, …) instead of a readable name — in the category dropdown of the expense form, in the property expenses table and in the per-property results breakdown, in every language. The landlord app runs `next-translate` with `keySeparator: false`, so `t('expenseCategory.works')` looks up a flat key of that exact name, but the categories were stored as a nested `expenseCategory` object. The keys are now flat (`"expenseCategory.works"`), so they resolve, and they were added to `scripts/.keptkeys.json` so `generateStrings` no longer prunes them (they are referenced through a template literal the harvester cannot see).

### Changed

- **The side menu collapses to a rail of icons.** A **Collapse menu** control at the foot of the menu narrows it from 240 px to 64 px and the page content follows, both over 300 ms — and it is remembered, so it stays as you left it. The labels wipe away rather than reflow: the icons sit 20 px from the edge, which is exactly the centre of the collapsed rail, so nothing moves as the text goes. Collapsed labels remain in the markup, clipped, so the buttons keep their names for a screen reader and pick up a plain hover hint (the tooltip library would have cost the app shell 16 kB for a one-word hint it already had). Reduced-motion settings get the end state with no animation.
- **The menu is headed by the Bayle seal, not by your organization's name.** The seal and the wordmark are the fixed anchor — collapsed, the seal is all that is left, and a truncated organization name would not have survived that. The organization now reads as a small line beneath the wordmark, which also fixes its overflowing the 240 px menu when the name was long. Signing out is a proper bordered button at the foot of the menu instead of a quiet line of text, and the row of create-shortcuts on the dashboard carries an accessible name so a screen reader announces it as a group rather than five loose buttons.
- **One type scale, one green and one amber.** The screens were consistent about tokens but not about sizes: a page title and the figures inside its cards were both drawn at 30 px on a wide screen, so nothing led the eye, and the metric tiles were inset 16 px while the panels beside them were inset 24 px, so their contents did not line up. The app now uses a five-step scale — 36 px page title, 24 px figure, 18 px panel title, 14 px body, 12 px label — and a single 24 px card inset throughout. The chart colours were also a near-miss of the paid/not-paid colours used in the figures, two greens and two ambers a few points apart; the chart palette is now defined *as* those colours, so a bar and the figure describing it match exactly. Every amount in the app is set in lining figures, headings balance their last line, and the share bars under a figure grow from zero as the screen arrives (not under `prefers-reduced-motion`). A figure that leads somewhere carries a chevron, so a clickable tile is told apart from a static one before you hover it.
- **Every screen now has a heading.** The landlord app dropped you straight into a search bar or a grid of cards; on a wide screen the only clue about where you were was the highlighted entry in the side menu. Each screen now opens with its name, a line of context under it, and the control that drives the whole page on the right: the month picker on Rents, the year picker on Accounting (both taken out of the card grid they were crammed into), the lease status and dates on a tenant, the vacant/rented status and type on a property. The settings screens, which used to put their title inside the first card, use the same heading. The period picker itself was rebuilt as a compact horizontal `‹ month ›` control instead of a label stacked above two arrow buttons, and it now takes the period from the address bar rather than keeping its own copy, so browsing back could no longer leave it showing a different month from the screen behind it. On Accounting the search moved up beside the year picker, which leaves that screen without a card wrapped around a single search field.
- **The dashboard now shows a landlord's figures instead of generic counters, in a deliberate reading order.** The occupancy percentage, the tenant count and the property count told you little when you manage a handful of lots. In their place, four figures you act on: **Collected this month** (with a bar showing how much of what the month calls for has come in), **Outstanding rent** (everything still owed across every term reached, ended leases included, with the number of tenants concerned — clicking it opens the unpaid rents), **Revenues** for the year, and **Deposits held** (the security deposits of running leases still in your hands, net of refunds and of rents settled out of a deposit). The counts did not disappear: a **Portfolio** card shows how many lots are rented out of the total, and how many tenants. The half-donut chart that encoded two numbers was dropped — the same information is in the "Collected this month" figure and its bar — which also means the unpaid rents no longer wait for a chart library to load before appearing.
  The screen is now read top to bottom: the figures open it, a single **Needs attention** panel follows with the rents still owed and the leases about to run out (previously two separate full-width cards on either side of a chart, so the two things asking for action were the furthest apart on the page), then the year in review. The create-shortcuts keep their place under the heading — a keyboard user reaches the app's most frequent action without crossing the page — but are drawn as a quiet row of actions above a hairline rather than a card of five large buttons competing with the figures, and the row now carries an accessible name so a screen reader announces it as a group rather than five loose buttons. When nothing is owed and no lease is ending, the panel says so once instead of twice. The heading also names the screen — _Dashboard_, with the welcome line moved underneath it and the day's date set to the right — so it follows the same rule as every other screen.
- **The rents screen reads at a glance.** Each row now carries a **Paid / Partially paid / Not paid** badge, so the status no longer has to be inferred from the colour of a number. Unpaid stays amber and paid green as everywhere else, but a settled rent gets the solid badge and the unpaid ones a quiet outline: early in a month nearly every row is unpaid, so filling those would have made the marker into texture rather than a signal. The amounts sit in right-aligned columns with lining figures so they line up down the list, the column keeping its width for short amounts without clipping long ones (a Colombian or Brazilian amount is far wider than a euro one). The period figures (not paid, paid, number of rents) were hidden on small screens and are now shown there too, the paid figure gaining a bar for the share settled. The bare select-all checkbox above the list finally has a label.
- **The card components were split by what they do.** A single `DashboardCard` was serving as the KPI tile, the wrapper around a list or a chart, and the box around the period picker, which is why callers kept passing alignment overrides to fight its layout and why a list of tenants had to undo a `text-3xl` set by its container. It is replaced by two: a metric tile (label, figure, context line) and a panel (title, description, arbitrary content). The tenant lease/rental cards, the property and previous-tenants cards, the expenses summary tiles and the rents overview all moved onto the right one.
- Trimmed the JavaScript loaded up-front on the heaviest screens by loading their heavy libraries only when needed: the PDF and image viewers on a tenant's page (−146 kB of initial JS), the charts on the dashboard (−99 kB) and on a property's Results tab (−94 kB) now load on demand. Also finished removing MUI — the dead `commonui` Material-UI components and their dependencies are gone, so the repository no longer ships Material-UI at all.
- The property **Expenses** tab now summarises the costs instead of only listing them. A year filter (defaulting to the most recent year, plus an "All years" option) drives three summary cards — the total for the period with its year-over-year change, the number of expenses with the average per expense, and the main category with its share — a breakdown-by-category bar list, and a total row at the foot of the table.
- Replaced the loading indicator and the generic stock (undraw) illustrations with on-brand artwork: a branded **seal loader** (a sweeping arc on the Bayle seal, reduced-motion safe) shown while pages load, and minimal line-art illustrations (house, document, seal) for empty and welcome states. Loading states inside tabs (e.g. the Expenses tab) now show content skeletons instead of a blank area.
- Reworked the sign-in hero around an **animated Bayle seal**. The generic stock illustration is gone; the pine side panel now centres on the seal, which draws itself on load (ring, then roof and house, then the keyhole pops in) with the dashed outer ring turning slowly like a living stamp, over a soft glow and a large ghosted seal watermark. The animation is CSS-only and disabled under `prefers-reduced-motion`. The mobile header seal animates too.
- Reworked the top bar / account access. The top-right avatar button, which only opened the settings page, is gone. In the landlord app the account section (user name, e-mail and a clear **Sign out** button) now sits at the bottom of the left side menu (and at the bottom of the mobile hamburger menu); settings stay reachable through the existing **Settings** entry in that menu. In the tenant app, which has no side menu, the avatar sheet is replaced by an inline e-mail + **Sign out** button shown directly in the top bar. The upstream "Sponsor this project" button was also removed from the menu.
- Rebranded to **Bayle** with a distinct visual identity, to differentiate the fork. New palette — pine green primary with a stone ground and a brass accent, replacing the default blue — applied through the shadcn design tokens (`globals.css`, landlord + tenant, light and dark) and the legacy MUI theme, so every screen picks it up (dashboard, rents, tenants, properties, sign-in). New seal favicon (roof + key), a serif wordmark, and a reworked sign-in screen. The name is the `APP_NAME` env var (default is now `Bayle`), so it stays a one-line change. The original MIT copyright (Camel Aissani) is unchanged.
- The two front-end workspaces (`landlord`, `tenant`) now declare `"license": "MIT"` in their `package.json`, like every other workspace, and the `LICENSE` file carries the fork's copyright line (`Copyright (c) 2025-2026 Mael Lacour`) alongside the original author's.

### Removed

- Dead code left behind by earlier work. The `commonui` package's locale files and its string-extraction script went with the Material-UI components they served — that package holds only utility functions now, its extractor was crawling a `components` directory that no longer exists, and nothing loaded those translations (the landlord app cannot, as the comment in its `i18n.js` explains, and the tenant app has its own). A 300-line stylesheet from the Material Dashboard React template the app was originally scaffolded from was still in the landlord sources, unreferenced. The unused `toggle-group` component and its Radix dependency are gone. Finally the `--chart-3`, `--chart-4` and `--chart-5` colour tokens are gone from the landlord app, which only ever charts paid and unpaid, and the whole chart palette is gone from the tenant app, which draws no chart at all. The landlord image and the dev compose file no longer reference those deleted paths, nor the `commonui/components` directory emptied when the Material-UI components went — a bind mount on a directory that does not exist has Docker silently recreate it as root, which is how a stray empty one appeared in the working tree.

## [1.8.0] - 2026-09-08

### Added

- Per-property annual results. A property now has a **Results** tab (Properties → a property → Results) showing, for a chosen year, the revenue collected, the expenses recorded against it, the resulting net result, the occupancy rate, and a breakdown of the expenses by category plus a month-by-month revenue chart. Accounting gained a matching **Properties** tab listing every property side by side for the year, with a CSV export.
  Revenue is counted on a **cash basis**: a payment belongs to the year it was received in, not to the year of the rent term it settles — so a December rent paid in January counts for the following year. The rent charged for the year's terms and the amount still due on them are shown separately, as information.
  When a lease covers several properties, the amounts are split between them in proportion to their configured rent, and the affected rows say so. Deposit retentions are included in the collected revenue and called out, since that money was received earlier as a deposit.
- The accounting "Outgoing tenants" view and its CSV export now show a "Retained on rents" amount when part of a tenant's deposit was used to settle rents. Without it the deposit, the refund and the amount still to refund no longer added up on screen.

### Fixed

- Tacit renewal no longer extends a contract with free rent. Renewing rolled the contract's end date forward but left each rented property's exit date behind, and a property is only billed on the terms falling inside its own entry/exit window — so every term added by the renewal charged nothing and showed only the balance carried over. The exit date now follows the contract end, while an exit date deliberately set earlier (a property handed back before the others in a multi-property lease) stays where it is. As a side effect, a final period that the old end date cut short is now billed in full once the contract is renewed over it, since the tenant occupies the whole of it.
- Contracts with a non-monthly term length (days, weeks, years) no longer have their rent schedule silently rebuilt on a monthly grid. The term length was read everywhere in the rent code but was missing from the tenant schema, so it was dropped on every save and every read fell back to "months" — recording a single payment on, say, a 10-day contract regenerated the whole schedule as monthly terms and destroyed it. The term length is now stored on the tenant, taken from the contract's time range when it is not supplied, and existing tenants are backfilled from their contract on startup. The rent schedule and the payment statement also now label the periods correctly for those contracts (days and weeks instead of months).
- A rent settled with a "Deposit retention" payment no longer inflates the deposit you are shown as still holding. The retention was only subtracted on the rent payment statement PDF; everywhere else the deposit was reported in full, so the accounting "Outgoing tenants" view and its CSV export, the `{{lease.depositToRefund}}` template variable used by the "solde de tout compte" letter, and the deposit shown to the tenant in their own space all claimed the whole deposit was still owed back. A deposit of 1 000 with a 500 retention now reads 500 everywhere.
- The final balance of an outgoing tenant no longer counts a deposit retention twice. The retention is already part of the rent payments, and the deposit was added on top of them in full, crediting the tenant with the same 500 twice over.
- The "Levy" payment method is no longer labelled as a tax. German, Brazilian and Colombian landlords saw it as "Abgaben", "Imposto"/"Comissão" and "Impuesto" — a tax or a commission — in the payment method dropdowns and in the settlements CSV export, where what is meant is a direct debit. German also called the security deposit an "Anzahlung" (a down payment) in two labels while using "Kaution" everywhere else, and left "transfer" untranslated in the CSV export. Finally the "Deposit retention" type added in 1.7.0 had no server-side label at all, so the settlements CSV printed a raw "deposit" in all five languages.
- Payment methods no longer show up as `### cheque ###` in the tenant's invoice list. The shared `PaymentMethod` type still listed the methods of the app's original skeleton (`credit-card`, `check`) instead of the ones the landlord app actually records, and the tenant locale files followed it — so a rent paid by cheque, by direct debit, or settled out of the deposit had no translation and fell back to the missing-key placeholder, in all five languages. The type now matches what is written (`transfer`, `cheque`, `cash`, `levy`, `deposit`) and the three missing labels are translated.
- The deposit refund status no longer stays stuck on "to refund" (then "overdue") after a partial refund. You record a refund date to close the file even when you keep part of the deposit for damages, but the accounting query dropped that date before the status was computed, so the deadline alert never cleared. A deposit entirely kept through retentions is now settled as well.
- Filled the remaining translation gaps in German, Spanish and Portuguese, which fell back to English. The rent payment statement PDF (33 strings) was English/French only; so were the deposit date/refund labels, the optional statement note and the expense-editing labels on the landlord side. These are now translated, and `commonui` — the shared address/contact form labels, entirely English in Brazilian Portuguese — was translated too. Beyond the payment methods above, several wrong-context terms were corrected in de/es/pt: Lease, Deposit, Capital, Balance, Application, Building and Room, plus garbled one-time-code and payment-reminder email text. The `renter` member role — a landlord-side collaborator, not the tenant — now reads as the letting side in every language (_Loueur_ / _Vermieter_ / _arrendador_ / _Locador_) instead of a word meaning "tenant". A few French typos were fixed as well (_Accepter_, _Bienvenue_, "_Envoyer par email_", missing elisions). Fork localisation conventions were kept (pt-BR `IBAN` → _Agência/Conta_, `EIN` → _CNPJ_; es-CO `EIN` → _NIT_).

## [1.7.0] - 2026-08-31

### Added

- New "Deposit retention" (_Retenue sur dépôt de garantie_) payment type when settling a rent. Use it to mark a rent as paid when you kept the amount out of the tenant's security deposit rather than receiving a bank transfer — no reference is required, and it prints as its own method on the rent payment statement PDF. It is not offered as a deposit payment/refund method (where it would make no sense). The statement's "deposit retained / net still due" offset excludes amounts already recorded as a retention payment, so a rent settled this way is never double-counted as a phantom credit to the tenant.

## [1.6.0] - 2026-08-28

### Added

- Optional note on the rent payment statement PDF. Downloading the statement (tenant's rent schedule) now opens a small dialog where you can type a free-text note; it is printed in a "Note" section at the end of the statement. Leave it empty to get the statement as before. The note is per-download — it is not stored.

### Fixed

- The tenant's postal code is now shown next to the city in the rent payment statement PDF header. The statement builder omitted the tenant's `zipCode`, so the address line printed only the city.

## [1.5.0] - 2026-08-27

### Added

- Tacit renewal (reconduction tacite) for contracts. A contract (Settings → Contracts) can be flagged "automatically renewable"; a tenant on such a contract has its end date rolled forward by one contract duration as needed, so the rent schedule keeps running past the original end date instead of stopping. The end date advances automatically when the tenant's rents are browsed or a payment is recorded (there is no background scheduler, so the shift happens on those accesses). Terminated leases are never renewed.

### Changed

- Continuous integration now runs the unit test suites (`common`, `api`, `cli`) on every push and pull request, and the Docker image build depends on them passing. Previously CI only ran linting and the image build, so no test was ever executed. The `common` suite — dead since the TypeScript/ESM migration — was repaired (it runs against the compiled `dist`) so it can run again.

### Fixed

- Dates in the rent payment statement PDF no longer render with their slashes escaped (e.g. `01&#x2F;01&#x2F;2026`). The statement's date fields are interpolated through the i18n layer, which HTML-escapes values by default, and `/` escapes to `&#x2F;`. The four date-bearing strings now use the unescaped form so `DD/MM/YYYY` dates print correctly.

## [1.4.0] - 2026-08-26

### Added

- New "Rent payment statement" PDF, downloadable from a tenant's rent schedule (échéancier). It covers the whole lease and is meant for a dossier when a tenant leaves with unpaid rent: landlord/bank details and tenant identity in the header, a recap of total charged / total paid / remaining balance, a month-by-month schedule (previous balance, amount due, paid, running balance) and a chronological list of every payment received (date, period, method, reference, amount). When a security deposit is still held (not paid back), the recap also shows the deposit retained and the net amount still due after offsetting it against the debt. When the deposit's move-in payment details are recorded (amount, method, date, reference), they are printed as well.
- Security deposit received at move-in now records how it was paid, alongside the amount. The lease "Deposit" section gained a payment method (transfer, cheque, cash, levy), a date and a reference (hidden for cash payments).

### Fixed

- The tenant card's tenancy duration no longer reads backwards for a tenant whose lease has not started yet. A future begin date now shows "Tenant in {{duration}}" instead of "Tenant for {{duration}}", which previously dropped the sign and claimed the tenant had already been in place.

## [1.3.0] - 2026-08-14

### Added

- Security-deposit refund now records how it was paid back, alongside the amount and date. The lease "Termination" section gained a refund method (transfer, cheque, cash, levy), a reference (hidden for cash payments) and a landlord-only note.

### Changed

- The tenants list now opens filtered to running leases by default (you can still clear the filter to see ended leases). Each tenant card also shows how long the tenant has been in place and the total amount paid over the whole lease.

### Fixed

- Tenant phone number in document templates. The template field picker still offered two tenant phone markers (`{{tenant.contacts.[0].phone1}}` / `phone2`) left over from the old two-field form; since the tenant contact now stores a single `phone`, both always rendered empty. Replaced them with a single working `{{tenant.contacts.[0].phone}}` marker. Templates already using the old `phone1`/`phone2` markers must be re-inserted with the new one.

## [1.2.1] - 2026-08-11

### Fixed

- All the chromium features the pdfgenerator means to turn off are now actually turned off. The launch arguments passed eleven separate `--disable-features` flags, but chromium only honours the last one, so only `site-per-process` was ever disabled. They are now merged into a single flag.
- Chromium is now closed properly when the pdfgenerator service shuts down. The shutdown handler failed twice over: it removed the temporary directory non-recursively (which throws on a directory), and then called an `exit()` function the chromium engine does not provide, so the browser was never closed and the temporary files were never cleaned up.
- Document generation now recovers on its own when chromium fails to start. Previously, if chromium could not be launched at startup the error was only logged, the service still reported itself as ready, and every document request failed with "chromium has not been started" until the container was restarted by hand. The engine is now retried on the next document request.
- The landlord and tenant frontends no longer fail with an Internal Error (HTTP 500) on every page. The axios 1.19.0 bump pulled in `get-intrinsic` 1.3.1, whose new `async-function` / `async-generator-function` / `generator-function` dependencies use a `module-sync` conditional export that Next.js standalone file-tracing does not follow, so the file it points at was missing from the built image. `get-intrinsic` is pinned to 1.3.0, which does not have those dependencies.

## [1.2.0] - 2026-08-10

### Added

- Security-deposit refund tracking. The lease end now carries a legal refund deadline (2 months after the effective end date) and a status — to refund / overdue / refunded — shown in the "Outgoing tenants" accounting view and exported in its CSV.
- New contract template variables for building a "solde de tout compte" (final settlement) document: `{{lease.terminationDate}}`, `{{lease.depositRefund}}`, `{{lease.depositToRefund}}`, `{{lease.depositRefundDate}}`, `{{lease.depositRefundDueDate}}`.
- Ready-to-use "solde de tout compte" template (French deposit-refund settlement letter) in `docs/templates/solde-de-tout-compte.md`, to copy into the landlord text-template editor.
- Per-property expense tracking. A new "Expenses" tab on the property page lets you record the landlord's own deductible expenses (works, insurance, property tax, condo charges, management fees, loan interest, other) with a date, amount and description — useful for the French *revenus fonciers* (régime réel) declaration. (adapted from jpfrehe's fork, decoupled from its banking service)

### Changed

- Tenant contact's name field renamed from `contact` to `name` in the database, to match the landlord (Realm) contacts schema. Existing records are migrated automatically on API startup.
- Harmonized the date pickers in the contract/lease form. The lease form now uses the same calendar date picker (shadcn) as the rest of the app instead of the legacy Material-UI one, so the termination date, lease dates, and per-property dates are consistent with the termination dialog and other screens.
- Rent is now prorated for partial periods (pro rata temporis). A tenant entering or leaving mid-month — or a lease terminated early — is billed only for the days actually occupied, instead of a full month. Full periods are unchanged.
- Terminating a lease now only sets the termination date. The deposit refund (amount and date) is recorded separately, afterwards, in the lease form's Termination section — you no longer have to guess the refund amount at termination time (before the exit inventory).

### Fixed

- Tenant contact phone number is now saved. The tenant form used `phone1`/`phone2` fields that the database model (single `phone`) silently dropped; the form now uses a single `phone` field that matches the model.
- Clearer validation messages for the contract termination date, and removed a few edge-case crashes in the lease form (unset dates when opening the termination picker or submitting an expense with no dates).
- A property expense with no date window is now billed on every term (previously it was silently dropped from the rent).
- Recording a rent payment no longer fails with a `CastError` for tenants whose embedded property snapshot has a shape Mongoose can't re-cast (e.g. string entry/exit dates). Only the computed `rents` are persisted now, instead of rewriting the whole document. (ported from jpfrehe's fork)

### Security

- Bumped `axios` from 1.8.4 to 1.19.0 across all services and frontends (SSRF and credential-leak fixes).

## [1.1.0]

### Added

- Landlord signature: upload, preview, and remove from Settings.
- Signature displayed in generated PDF invoices and rent documents.
- Signature support in contract templates (text editor).
- App version displayed in sidebar menu.
- HTML emails (may have issues in German and Brazilian translations).
- Support for multi expenses in leases (#231).
- Colombian translation (#115).
- Total Rent Including Charges and VAT fields in the text editor (#237).
- Keywords for current date (day, month, year) in the text editor (#238).

### Fixed

- Signature image now renders correctly in generated PDFs.
- Signature persists in Settings form after page reload.
- Fixed issue #267.
- Tenant form no longer resets when switching between tabs while editing.
- Charge (expense) date range fields no longer mutate form state on render.
- Dashboard "not paid" amounts no longer include carry-forward debt from previous months.
- All services now consistently use fork images, preventing silent field drops from upstream schema mismatches.
- Invoices and rent documents can now be generated for tenants whose name contains a slash or other special characters. Their download buttons silently did nothing, and their invoice emails were never sent.
- Document and CSV download buttons now report a failure instead of silently doing nothing.
- Document generation failures are now logged and returned as a server error, instead of being reported as "not found".
- `ServiceError` now keeps the original error as its `cause`, which a typo had been discarding for every wrapped error.

## [1.0.0-alpha.3]

### Added

- Simplified the self-hosting procedure, using docker-compose.yml and supporting https.
- Brazilian translation (#18).

### Changed

- Changed theme, icons and illustrations.
- Reworked the signin and signup pages.

## [1.0.0-alpha.2]

### Added

- New environment variable `MRE_VERSION` used by the `mre` command to run a specific version of the application.
- `ci` option to the `mre` command to run it in the github CI workflow.
- `applications` in realms to store per-organisation application credentials (for M2M authentication).
- `authenticator/landlord/appcredz` API endpoint to generate new application credentials.
- Application credentials management to landlord frontend (Settings > Members).
- CLI key generation for signing application credentials.
- Responsiveness to the Landlord application.
- German translation.
- Feature to create a property from an existing one (#192).

### Changed

- `authenticator/landlord/signin` API endpoint to support both user credentials (email/password) and application credentials (clientId/clientSecret).
- Docker images updated to Node.js version 20 (new minimum requirement).
- Minimized size of the docker containers.
- Improved A4 page breaks in the rich text editor.

### Removed

- Omitted `mre`, `mre-macos`, and `mre.exe` from the repository, as they are now available for download in the release.

### Fixed

- Fixed issue #162 - Cannot save Backblaze settings.
- Fixed issue #187 - SMTP Authentication.
- Fixed issue #190 - Terminate lease dialog error message.

### Security

- Updated dependencies to avoid CVEs.
- Minimized docker containers using distroless images.
- Fixed CWEs.

## [1.0.0-alpha.1]

### Added

- Completed implementation of tenant app phase 1 ([#118](https://github.com/microrealestate/microrealestate/issues/118)). Tenant contact emails set in the landlord app are now used to sign in into the tenant app.
- `configure` option to the cli to run prompts to generate the .env file even if it already exists. This will not overwrite the existing tokens and secrets already set in the .env file.
- CLI configuration of a base email delivery service in .env file. Required to send forgot password emails and to sign in with a magic link into the tenant app.
- Validator in the cli to check if the .env is valid before starting the app.
- Continued to introduce typescript in the project (see folders: types, webapps/tenant, services/common, services/tenantapi, services/gateway).

### Changed

- Upgrade `redis` and `mongo` containers to newer versions. Old Mongo databases are not compatible with the new version. Before upgrade, do a backup with `mre dumpdb`, remove old database in `data/mongodb`. After upgrade, restore database with `mre restoredb`.
- `GATEWAY_URL` and `DOCKER_GATEWAY_URL` environment variables are not ending with `/api/v2` anymore. The .env file will be updated automatically by the cli when restarting the app.
- Forgot password email is now sent using the email delivery service configured in the .env file and not the one from the landlord app settings.
