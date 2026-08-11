# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
