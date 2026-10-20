# Deployment status — 20 October 2026

## Saved work

The review fixes were reconciled with all 35 newer commits on production `main` (`6f787e9`). Commit `2844886` was pushed to `main` and deployed successfully to production.

The reconciled implementation preserves paid promotions, vendor subscriptions, customer order tracking, Google staff login, app-metadata roles and `manage-vendor-access`. The superseded alternative staff-members migration/function have been removed.

## Verified targets

- GitHub: `abubakar-r-salihawa/zarahs-store`
- Vercel: `kang9/zarahs-store`, production `https://zarahs-store.vercel.app`
- Supabase: `hlodwqvkvudhfzbophwg`, store owner's organization

## Hosted state

The owner approved resuming the paused Supabase project. Resume succeeded.
An inventory taken during restoration incorrectly appeared empty. A subsequent transactional initialization attempt stopped on an existing-table error and rolled back. A fresh inventory confirmed 3 vendors, 38 products, 3 orders, 6 Auth users and 3 private staff identities. Do not initialize or reseed this project.

The compatible `202610180001_checkout_reliability.sql` migration was applied successfully. A hosted transaction tested multi-vendor checkout, server-calculated discounts and idempotent retries, then rolled back all test changes. Product, order and Auth-user counts remain unchanged. Anonymous checkout execution and direct client order inserts are denied.

The existing confirmed owner account now has a linked private staff identity and the admin app-metadata role. Sign out and back in to refresh existing sessions. The deployed `manage-vendor-access` Edge Function matches the checked-in source and has JWT verification enabled.

Vercel reported successful production deployment: https://vercel.com/kang9/zarahs-store/D9HRU1dwWtAJEk28bfrXjpX6u98y. All 13 production HTML pages returned HTTP 200 and exactly matched the tested source, as did the sampled shared scripts and responsive stylesheet. Security headers were present. Database setup scripts, tests and local deployment artifacts returned HTTP 404.

On 20 October 2026 the owner authorized free extensions. All three existing boutique trials were extended by 30 days, through 19 November 2026 at 14:17 UTC. No payment records were created. The hosted database confirms three active boutiques, 38 products and three existing orders.

The account-deletion request migration is applied. Its hosted rollback test passed without leaving any request behind. The vendor-management Edge Function is now version 2 with exact native application origins added and JWT verification retained. Native and production staff-login callback URLs were added to the existing Auth allowlist.

Real email delivery, Google OAuth sign-in, live staff-session refresh and WhatsApp delivery still require owner acceptance testing. Supabase's security adviser also reports that leaked-password protection is disabled; enable it where supported before commercial launch.
