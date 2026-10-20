# Deployment status — 20 October 2026

## Saved work

The review fixes were committed as `939c624` and pushed to `codex/marketplace-security-responsive`. Reconciliation with all 35 newer commits on production `main` (`6f787e9`) is being saved on `codex/reconcile-production`.

The reconciled implementation preserves paid promotions, vendor subscriptions, customer order tracking, Google staff login, app-metadata roles and `manage-vendor-access`. The superseded alternative staff-members migration/function have been removed.

## Verified targets

- GitHub: `abubakar-r-salihawa/zarahs-store`
- Vercel: `kang9/zarahs-store`, production `https://zarahs-store.vercel.app`
- Supabase: `hlodwqvkvudhfzbophwg`, store owner's organization

## Hosted state

The owner approved resuming the paused Supabase project. Resume succeeded.
An inventory taken during restoration incorrectly appeared empty. A subsequent transactional initialization attempt stopped on an existing-table error and rolled back. A fresh inventory confirmed 3 vendors, 38 products, 3 orders, 6 Auth users and 3 private staff identities. Do not initialize or reseed this project.

The compatible checkout migration has not yet been applied. Production frontend has not been updated. The existing vendor-management Edge Function is present and includes Auth validation and the vendor-management RPC.

The owner supplied an email for admin access; no corresponding private staff assignment was found and no new role assignment has been made. All three vendor trial subscriptions had expired on 12 September 2026. Deployment must not fabricate payments or silently extend those subscriptions.

On 20 October the browser connection failed before reaching the dashboards. Finish the backend upgrade and owner-access verification once that connection is restored, then publish production and verify the resulting deployment.
