# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
