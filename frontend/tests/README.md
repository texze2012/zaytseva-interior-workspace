# Session recovery browser regression tests

These tests load the running Next.js application in Chromium and replace every API response with synthetic fixtures. They never submit credentials to a real backend or read production user data. `BASE_URL` must be a loopback address; use an SSH tunnel to inspect a remote candidate. External HTTP requests are blocked.

From the `frontend` directory, install the browser test tooling without changing the application dependency manifest or lockfile:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
```

Start the application separately, then run:

```sh
BASE_URL=http://127.0.0.1:3000 node tests/auth-regression.cjs
```

`BASE_URL` defaults to `http://127.0.0.1:3000`. If dependencies are installed elsewhere, set `PLAYWRIGHT_MODULE` to the Playwright module path. Set `CHROMIUM_EXECUTABLE` to use a specific browser binary. Otherwise the runner uses Playwright Chromium if available, then the installed Chrome channel.

The 12 scenarios cover:

- Saved-token network, 500, 502 and 503 failures preserve the session across reload; manual retry restores the original path and query.
- A 401 response clears the expired token and opens the login screen.
- A temporary profile failure after successful login preserves the newly issued token.
- Ordinary anonymous login still works.
- A hung profile request times out without losing the saved session.
- Automatic and online-event retries recover without another login.
- Explicit logout clears the retained token during an outage.
- Logout during a pending retry rejects a late successful profile response.

The late-response scenario alone wraps `fetch` to ignore the profile request's `AbortSignal`. This deliberately forces a late response and checks the application's stale-request guard even when transport cancellation is ineffective.

For a focused smoke check, filter by test name and preserve a separate report:

```sh
BASE_URL=http://127.0.0.1:3000 \
  CASE_FILTER='survives 503|401 clears' \
  REPORT_NAME=smoke.json \
  node tests/auth-regression.cjs
```

JSON reports and screenshots of failures are written to `tests/results/`. Exclude that directory from Git. The runner fails on an uncaught browser error or an unexpected API mutation as well as failed assertions.
