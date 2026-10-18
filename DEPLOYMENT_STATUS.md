# Deployment status — 18 October 2026

The reviewed local changes are saved on `codex/marketplace-security-responsive`.
They have **not** been merged into production or applied to Supabase.

Fetching GitHub revealed that `origin/main` at `6f787e9` contains 35 commits
absent from the checkout used for the review. Those include customer order
tracking, paid promotions, vendor subscriptions, and staff access using Auth
app metadata with the `manage-vendor-access` function.

Do not apply this branch's `202610160001_secure_marketplace.sql` migration or
publish its frontend over production yet. Its staff-members and checkout
implementation must first be reconciled with the newer implementation and
the actual hosted schema. Preserve the newer production features and existing
accounts. Do not run the fresh database setup script on the live database.

Verified targets:

- GitHub: `abubakar-r-salihawa/zarahs-store`
- Repository-listed website: `https://zarahs-store.vercel.app`
- Frontend-configured Supabase project: `hlodwqvkvudhfzbophwg`

Vercel and Supabase dashboard access currently requires sign-in. Use the
accounts belonging to Zarah's Store, which the owner says are separate from
the AI-Guardina accounts. Verify account ownership and project identity before
making any deployment changes.

Local syntax, SQL fixture and Edge Function fixture checks pass. Those checks
do not establish compatibility with the newer production schema. Re-run the
full browser and backend checks after reconciliation, then upgrade and verify
the backend before updating the production frontend.
