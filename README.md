# Zarah's Store

A static HTML, CSS and JavaScript marketplace backed by Supabase Auth, PostgreSQL and Edge Functions. Hosting is on Vercel. There is no frontend build step.

Android and iOS beta projects now reuse this storefront through Capacitor. Run `npm ci` and `npm run mobile:sync`; see [MOBILE_RELEASE.md](MOBILE_RELEASE.md) for building, signing, testing and remaining submission requirements. Website hosting continues to use the existing static files.

Account deletion requests are available at `account.html`, with an owner review queue at `privacy-requests.html`. Apply `supabase/migrations/202610200001_account_deletion_requests.sql` after the existing schema on new environments. The live project already has this upgrade. Requests require manual fulfilment; they do not immediately erase accounts or orders.

## Deployment targets

- GitHub: https://github.com/abubakar-r-salihawa/zarahs-store
- Vercel project: `kang9/zarahs-store`
- Website: https://zarahs-store.vercel.app
- Supabase project: `hlodwqvkvudhfzbophwg`

These are the store's accounts, separate from AI-Guardina. Verify project identity before using any CLI credentials.

## Existing database upgrade

Do not run `supabase_setup.sql` or the seed file on the live database. The restored project contains existing products, orders, users and staff identities.

1. Retain a database backup and review `supabase/migrations/202610180001_checkout_reliability.sql`.
2. Apply that additive migration. It preserves the existing app-metadata staff roles, private staff identities, vendor subscriptions, paid promotions and customer order tracking. It adds retry protection and size/price validation to checkout. The previous order RPC remains available for the previous frontend during rollout.
3. Verify the existing `manage-vendor-access` Edge Function matches the source in `supabase/functions/manage-vendor-access/index.ts`. It validates the user's Auth token and requires an administrator role before invoking the service-only vendor-management RPC. Never put the service-role key in frontend code.
4. Publish the reconciled frontend through GitHub/Vercel. `.vercelignore` excludes tests, SQL, local dependencies and internal documentation from hosting.
5. Verify staff login, customer order tracking, vendor changes and checkout against the deployed project. The browser publishable key is intentional; RLS and backend authorization protect the data.

`supabase_setup.sql` and `supabase/seed_catalog.sql` are for an independently verified empty/new database only. The seed retains the application's existing catalog; verify prices, descriptions, photos and availability before a commercial launch. The setup creates 30-day vendor trials; existing expired subscriptions must be managed explicitly through the admin dashboard, not silently extended by deployment.

## Authentication and staff

Staff access uses Supabase Auth `app_metadata` plus `private.staff_identity`, preserving the production design. Do not create a competing `staff_members` table. An owner email assignment is a privileged operation; verify the intended account before assigning it. No credentials are stored in browser registries.

Configure the Supabase Auth site URL and redirects for the production `auth.html` and `vendor-login.html` routes. Google sign-in requires the project's Google OAuth configuration. Email-code flows require email templates containing `{{ .Token }}` and a six-digit code configuration. Test actual delivery using production SMTP. No email invitations or messages are sent by the deployment workflow.

## Checkout behavior

Customers must sign in to order. The database validates current prices, stock, product sizes and vendor subscription access. Orders and vendor-specific suborders are committed atomically. A stable checkout request ID prevents duplicate orders when a request is retried. `SAVE10` is validated server-side and its discount is distributed consistently across vendors.

Failed saves keep the cart. Success shows a separate WhatsApp link for each vendor; shoppers send the messages themselves. Payment and delivery are arranged with the seller. Saving an order does not collect money.

## Verification

Start a local server, then run:

```sh
python -m http.server 8080 --bind 127.0.0.1
node tests/check.cjs
node tests/edge-function.cjs
node tests/browser.cjs
```

Tests require Node.js 24+. The browser suite uses Playwright and Microsoft Edge; set `PLAYWRIGHT_PATH` when Playwright is installed outside the standard module path. Its network fixtures do not write to production.

For real SQL checks in isolated PostgreSQL:

```sh
npm install --prefix .test-runtime --no-audit --no-fund --ignore-scripts @electric-sql/pglite
node tests/database.cjs
```

The suite checks the actual schema, migration and seed, prices, variants, multi-vendor totals, atomic failure, retries, direct-write denial, customer privacy and subscription restrictions. Local fixtures do not verify hosted OAuth, SMTP, payments or WhatsApp delivery. See `DEPLOYMENT_STATUS.md` for the actual rollout status.
