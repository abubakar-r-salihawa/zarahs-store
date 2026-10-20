# Mobile beta and store release

The existing storefront is packaged with Capacitor. It uses the same Supabase project, order logic, HTML, CSS and JavaScript as the website. Native builds package the Supabase SDK locally and add PKCE browser sign-in, strict callback validation and Android back navigation.

The Android debug APK was compiled and launched successfully in an Android 15 Pixel Fold emulator. Native packaging checks passed. This is not a signed store release. Native pages use the existing CSS font fallbacks instead of waiting for external font stylesheets at startup.

App identifier: `app.zarahs.store`. Confirm this identifier before the first store upload; changing it afterwards creates a different app. Native Google login callback: `app.zarahs.store://auth/callback`. This exact callback and the two production staff-login URLs were added to the existing Supabase redirect allowlist on 20 October 2026. Existing redirects were preserved.

## Reproduce a build

Use Node 24+, Java 21 and the Android SDK required by `android/variables.gradle`.

```sh
npm ci
node scripts/mobile-icons.cjs
npm run mobile:sync
cd android
./gradlew assembleDebug
```

On Windows use `gradlew.bat`. Set `JAVA_HOME` to the Android Studio `jbr` directory and `ANDROID_HOME` to the installed SDK if they are not already configured. The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`; it is for testing, not store submission. No signing credentials are stored in Git. For iOS open `ios/App/App.xcodeproj` on a Mac, select the Apple development team, resolve Swift packages and test on a device.

The icon and splash assets are generated from `assets/app-icon.svg`. The UUID override patches a vulnerable transitive Xcode-tooling dependency while preserving its `uuid.v4()` API. Recheck this override when updating Capacitor.

## Owner tasks before submission

- Create and verify Google Play Console and Apple Developer accounts. No account was created, subscription purchased or store submission made by this work.
- Run real Android/iPhone tests: email verification, Google sign-in and callback, logout, checkout, app restart, Android back, keyboard, large text, poor connectivity and WhatsApp handoff. Automated browser fixtures do not establish device behavior.
- For iOS, assess Sign in with Apple/equivalent login requirements for the Google login flow and configure the required provider before submission.
- Set up and protect release signing credentials. Produce a signed Android App Bundle and an archived iOS release. Configure Play App Signing and the correct Apple team.
- Complete accurate Data Safety/App Privacy answers based on actual SDKs, logging, account/order data and provider practices. Audit iOS privacy manifests and required-reason APIs with Xcode.
- Confirm the public privacy notice, retention periods, support mailbox monitoring, delivery/returns terms and seller contact details. Support: `zarahsstore.Customersupport@gmail.com`.
- Review vendor subscription and paid-promotion flows against store billing rules; these are distinct from purchases of physical goods. Do not assume WhatsApp payment arrangements exempt digital vendor services.
- Capture screenshots on real target devices and supply review access without giving reviewers the owner account. Complete applicable Google closed testing and Apple TestFlight testing.

## Deletion request operations

Customers can initiate deletion at `/account.html` in the app or website. `/privacy.html` also provides an email route for customers unable to sign in. Requests are stored once per authenticated account; customers see only their own request, and the owner can review the queue at `/privacy-requests.html`.

This is a manual fulfilment workflow, not automatic deletion. The owner must monitor this queue and the support mailbox. Marking a request as reviewing does not erase data or notify the customer.

For each verified request:

1. Identify the account by the request's exact Auth user UUID. Verify email ownership for requests received outside the signed-in flow.
2. Resolve outstanding orders and determine the specific records and retention obligations that apply. Tell the customer what will be removed or retained and the expected completion date. Do not silently treat account deletion as an order cancellation.
3. Arrange a reviewed deletion/anonymization operation covering Auth, private staff identities, order contact details, vendor orders and any provider-held copies. The current `orders.user_id` foreign key restricts Auth deletion while orders reference the account; a blind dashboard delete will fail. A retention-aware fulfilment implementation is still required before public app-store launch.
4. For staff requests, transfer store administration or boutique access first. Remove the private staff assignment so a later sign-up cannot regain the old role.
5. Revoke sessions, complete the verified deletion, check that access has ended and record fulfilment without retaining unnecessary personal data. Successful Auth deletion removes its queue row through the foreign key.

Do not report completion to a customer merely because a request was submitted or marked reviewing. No live customer accounts or orders were deleted during development.

## Checks

```sh
npm test
node tests/database.cjs
node tests/browser.cjs
node tests/account-browser.cjs
npm run mobile:build
node tests/mobile.cjs
npm audit
```

Use the local static server at `127.0.0.1:8080` for browser tests. These tests use isolated fixtures. Database tests use the existing PGlite test dependency in `.test-runtime`.
