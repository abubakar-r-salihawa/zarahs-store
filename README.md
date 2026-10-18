# Zarah's Store

The existing HTML, CSS and JavaScript storefront uses Supabase for authentication, catalog storage and orders. The frontend has no build step. WhatsApp is used to discuss delivery and bank transfer with each seller; saving an order does not collect payment or send a WhatsApp message automatically.

## Required backend upgrade before publishing these changes

The frontend now requires the security migration and server function below. Uploading only the frontend will leave staff access and checkout unavailable. No live database migration or account changes have been performed by this code update.

1. Back up the existing Supabase project. For an **existing database**, run `supabase/migrations/202610160001_secure_marketplace.sql` in the Supabase SQL editor. This retains catalog/order data, protects the legacy credential tables, adds staff roles, and installs an atomic order function. For a **new database only**, run `supabase_setup.sql` first, then the migration. Never rerun the fresh setup on a populated database.
2. Create the administrator and existing vendor accounts in **Supabase Authentication → Users**, using new strong passwords. Existing shopper accounts already in Supabase Auth continue working. Old browser-only accounts must register again; legacy staff passwords are deliberately not accepted.
3. Assign staff roles from the SQL editor. Replace the email values with the actual Auth users created in step 2:

   ```sql
   insert into public.staff_members(user_id, role, vendor_id, name)
   select id, 'admin', null, 'Store Administrator'
   from auth.users where email = 'YOUR_ADMIN_EMAIL';

   insert into public.staff_members(user_id, role, vendor_id, name)
   select id, 'vendor', 'perfume', 'Zarah''s Perfume'
   from auth.users where email = 'YOUR_PERFUME_VENDOR_EMAIL';
   ```

   Repeat the vendor assignment for `kitchen` and `variety`. Check the inserted rows; an unmatched email inserts nothing. Existing legacy accounts are not migrated automatically. After verifying access and retaining any necessary backup, the owner should retire the quarantined legacy password data.
4. Deploy `supabase/functions/manage-vendor/index.ts` with the Supabase CLI or dashboard. The function uses Supabase's server-provided service-role key, validates the caller's Auth token and checks the administrator role on every request. Never put a service-role key in frontend files.

   ```sh
   supabase functions deploy manage-vendor --project-ref YOUR_PROJECT_REF
   supabase secrets set ALLOWED_ORIGINS=https://YOUR_SITE_DOMAIN --project-ref YOUR_PROJECT_REF
   ```

   `ALLOWED_ORIGINS` accepts comma-separated exact origins, without trailing slashes. Add the local origin only when testing locally. The administrator can then create, edit and remove boutiques through the existing dashboard. Removing a boutique revokes its vendor role while retaining that person's shopper account.
5. Configure the Supabase Auth site URL and allowed redirect URLs, including the deployed `auth.html` URL. Enable Google and configure its OAuth client if Google sign-in is required. Configure signup and magic-link email templates to show `{{ .Token }}` and use six-digit email codes, matching the current verification form. Configure SMTP/email delivery for production.
6. Publish the frontend together with `js/` and `css/`, then verify real staff login, shopper confirmation, vendor saves and a test order. The browser publishable key in `js/supabase.js` is intentional; database policies provide authorization.

## Checkout and security behavior

- Anonymous shoppers can browse and submit an order through `place_marketplace_order`; they cannot read customer orders or directly write catalog/order tables.
- Product prices, sizes, availability and `SAVE10` are checked in the database. All vendor orders save in one transaction, and retrying the same request does not duplicate them.
- The cart stays intact if confirmation fails. After success, shoppers get one WhatsApp link per vendor, containing only that vendor's items and allocated discount.
- Admin/vendor sign-in uses Supabase Auth and `staff_members` policies. Passwords and staff sessions are no longer accepted from local storage.
- Catalog and cart caching remain available. Failed authentication or database writes never silently become successful offline operations.
- Guest checkout is intentionally public. Before a high-traffic launch, add server-enforced abuse controls such as rate limits and CAPTCHA. Confirm delivery, returns, privacy and payment policies with the store owner.

## Local checks

```sh
python -m http.server 8080 --bind 127.0.0.1
node tests/check.cjs
node tests/edge-function.cjs
node tests/browser.cjs
```

The tests use Node.js 24 or later. The browser suite uses Playwright and Microsoft Edge. Install Playwright in your environment or set `PLAYWRIGHT_PATH` to its module directory. Its network fixtures exercise UI behavior without writing to production. The Edge Function test executes the actual handler against isolated SDK fixtures; it does not deploy it. Screenshots and results go to `test-results/`.

To test the actual SQL using isolated PostgreSQL (no Supabase account required):

```sh
npm install --prefix .test-runtime --no-audit --no-fund --ignore-scripts @electric-sql/pglite
node tests/database.cjs
```

This checks the real migration, row access rules, transaction rollback, prices, variants, stock, discounts and retry behavior. It emulates Supabase's Auth roles locally; it does not verify your hosted configuration, OAuth provider, email delivery, Edge Function deployment or WhatsApp delivery. There is no frontend compilation/build command.

## Frontend hosting

Complete the backend upgrade above before using any of these hosting options. Exclude `.test-runtime`, `node_modules`, `tests` and `test-results` from a production upload.

---

## ⚡ Option 1: Netlify (Easiest - 1 Minute)
Netlify allows you to publish the site instantly without typing any commands.

1. Go to [Netlify Drop](https://app.netlify.com/drop).
2. Drag and drop the entire `multi_vendor_shop` folder onto the page.
3. Wait 10 seconds. Your site is live with a free custom link!
4. *(Optional)* Go to Site Settings to change the URL or connect a custom domain.

---

## 🚀 Option 2: Vercel CLI (Recommended - 2 Minutes)
Deploy directly from your command line using Vercel.

1. Open PowerShell or Terminal and install the Vercel tool:
   ```bash
   npm install -g vercel
   ```
2. Navigate to your project folder:
   ```bash
   cd multi_vendor_shop
   ```
3. Run the deployment command:
   ```bash
   vercel
   ```
4. Follow the prompts (press Enter to accept the defaults). Your site will deploy, and you'll get a production URL.

---

## 🐙 Option 3: GitHub Pages (Free Hosting with Code Backup)
Host the site directly from a GitHub repository.

1. Create a new repository on [GitHub](https://github.com).
2. Upload the project files to the repository.
3. Go to the repository **Settings** tab.
4. Click **Pages** in the sidebar.
5. Under **Build and deployment**, set the Source to **Deploy from a branch** and select the `main` branch.
6. Click Save. Your site will be live at `https://<your-username>.github.io/<your-repo-name>/`.
