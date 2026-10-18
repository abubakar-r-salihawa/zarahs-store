# Application review — 18 October 2026

The existing static frontend, boutique branding, product catalog, Supabase integration, shopper accounts, wishlist, cart, discounts and WhatsApp ordering have been retained.

## Changes

- Replaced browser-readable staff passwords and forged local sessions with Supabase Auth plus database roles. Quarantined legacy password tables and removed credential downloads/default-password resets.
- Added a server function for administrator-managed vendor accounts. Dashboard mutations await database confirmation and surface failures.
- Added transactional checkout with authoritative prices, size/stock checks, retry protection and a separate order/link for each vendor. Failed orders keep the cart. WhatsApp messages require the shopper to send them.
- Fixed undefined storefront filters, missing cart calls, lost size selections, custom-vendor catalog lookup, deep links, mobile navigation links, cross-store search and the dashboard's missing review container.
- Added output encoding, safe URL handling, invalid-cache recovery, form labels, keyboard controls, focus management, visible mobile filters, responsive layout refinements and reduced-motion support.
- Consolidated duplicate font requests and fetched independent catalog tables together. Preserved offline catalog browsing without pretending offline authentication/orders succeeded.
- Changed database setup to avoid destructive table drops; deployment requirements are documented in README.md.

## Verification performed

| Check | Result |
| --- | --- |
| All shared JavaScript and 12 inline page scripts parse | Passed |
| Local file links/assets, duplicate static IDs and hosting JSON | Passed |
| 36 browser page/viewport combinations at 375, 768 and 1280 pixels | Passed; no uncaught page errors or horizontal overflow |
| Search, mobile filters, cart variants, promo and checkout failure/retry | Passed using isolated network fixtures |
| Separate WhatsApp destinations and duplicate-submit prevention | Passed; no messages sent |
| Unauthorized dashboard redirects and vendor editing success/failure | Passed using isolated Auth/database fixtures |
| Actual SQL setup and repeat migration in isolated PostgreSQL/PGlite | Passed |
| Database role isolation, legacy credential protection and order privacy | Passed |
| Server price, quantity, size and stock validation; multi-vendor totals and rollback | Passed |
| Idempotent order retries | Passed |
| Actual Edge Function handler authentication, CORS, admin role, validation and failure cleanup | Passed with isolated SDK fixtures |
| Desktop/mobile screenshots | Inspected; external images/fonts were blocked in automated fixtures |

## Remaining deployment verification

No live Supabase changes or deployment were made. Apply the migration, create/assign the existing staff Auth accounts, deploy `manage-vendor`, and configure its allowed origins **before publishing the new frontend**. The frontend requires this backend upgrade.

Real email delivery, Google OAuth, hosted database policies, the deployed Edge Function and actual WhatsApp delivery remain unverified. Follow the README upgrade steps and complete a real test order after deployment. No online payment processor has been added; bank transfer remains seller-managed.

Before a larger launch, add server-enforced guest-order abuse controls, confirm store policies/contact details, and replace any remaining demonstration catalog content with verified product information.
