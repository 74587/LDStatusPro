# Browser regression

Run `npm ci`, `npx playwright install chromium`, then `npm run test:e2e`.
For a single project: `npm run test:e2e -- --project=mobile`.
The CI browser job installs Chromium and runs the same desktop and mobile cases.
Failures retain a screenshot, trace and HTML report for seven days in CI.

The suite loads the actual application, router, Pinia stores, components and
service contracts. It exercises login/redirect/logout, checkout response loss,
reload recovery, price changes, blocked payment popups and catalog filters with
back navigation. It mocks HTTP at the browser boundary, including OAuth and
payment: it does not verify a real payment provider or production rendering.

Safety boundaries:
- The runner rejects production markers and passes only basic OS variables to
  Playwright. Application/provider credentials and VITE overrides are excluded.
- The dedicated Vite config uses `envDir: false`, has no production proxy, binds
  only loopback and rejects any `/api` request reaching its server.
- A fresh server is required; an existing development server cannot be reused.
- Browser contexts block service workers and abort all non-test-origin traffic.
- Every API request needs an explicit fixture; unmocked endpoints fail the test.
- Do not replace these boundaries with a staging/production base URL or real
  authentication tokens.

Playwright reference: [local web server](https://playwright.dev/docs/test-webserver)
and [HTTP mocks](https://playwright.dev/docs/mock).
