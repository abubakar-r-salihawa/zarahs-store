# Validation — reconciled production implementation

Preserved the original stack and branding together with the newer production features: paid promotions, vendor subscriptions, Google staff login and customer order tracking.

- Syntax, local links/assets, duplicate static IDs and hosting configuration checks pass.
- 39 browser page/viewport combinations passed at 375, 768 and 1280 pixels, with no uncaught page errors or horizontal overflow.
- Browser fixtures exercised filters, search, cart sizes, discounts, checkout failure/retry, vendor-specific links, duplicate-submit protection, staff redirects and confirmed/rejected product saves.
- Actual PostgreSQL schema, seed and repeated upgrade migration pass locally. Tests cover prices, sizes, atomic multi-vendor checkout, discounts, retries, direct-write denial, customer privacy and subscription enforcement.
- The actual vendor-management function passes isolated authentication, role, action and failure-propagation checks.

The frontend has no compilation step. Browser tests use isolated network fixtures; SQL tests use PGlite. These checks do not establish real email delivery, Google OAuth configuration, hosted staff login, payment collection or WhatsApp delivery.

Live Supabase was resumed, but the compatible migration and production frontend publication remain pending. See DEPLOYMENT_STATUS.md. Before commercial launch, verify catalog content, vendor WhatsApp numbers, store policies, subscription access and real sign-in/order flows.
