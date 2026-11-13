const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const target = new URL(baseUrl);
assert(['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname), 'BASE_URL must be a loopback address; use an SSH tunnel for the staging candidate.');
const origin = target.origin;
const tokenKey = 'zaytseva_interior_access_token';
const savedToken = 'synthetic-saved-access-token';
const loginToken = 'synthetic-new-access-token';
const fixtureUser = { id: 999999, name: 'Тест сессии', email: 'auth-regression@example.invalid', role: 'designer', created_at: '2026-01-01T00:00:00Z' };
const outputDir = path.join(__dirname, 'results');
fs.mkdirSync(outputDir, { recursive: true });
const results = [];
const caseFilter = process.env.CASE_FILTER ? new RegExp(process.env.CASE_FILTER, 'i') : null;
const reportName = process.env.REPORT_NAME || 'report.json';
assert.equal(path.basename(reportName), reportName, 'REPORT_NAME must be a simple file name');

async function poll(check, message, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.fail(message);
}

async function setup(browser, initialToken = savedToken, failure = 503, ignoreProfileAbort = false) {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: initialToken ? [{ origin, localStorage: [{ name: tokenKey, value: initialToken }] }] : [] },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const state = { failure, meRequests: [], loginRequests: 0, unexpectedWrites: [], pageErrors: [], pendingProfiles: [] };
  if (ignoreProfileAbort) await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (resource, options) => {
      const url = String(resource);
      if (/\/users\/me(?:$|\?)/.test(url)) {
        const { signal, ...rest } = options || {};
        return originalFetch(resource, rest);
      }
      return originalFetch(resource, options);
    };
  });
  page.on('pageerror', error => state.pageErrors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const isApi = url.pathname.startsWith('/api/') || (url.port === '8000' && url.hostname === '127.0.0.1');
    if (isApi) {
      const apiPath = url.pathname.replace(/^\/api/, '');
      if (apiPath === '/users/me') {
        state.meRequests.push({ authorization: request.headers().authorization, at: Date.now() });
        if (state.failure === 'pending') { state.pendingProfiles.push(route); return; }
        if (state.failure === 'network') return route.abort('failed');
        if (state.failure) return route.fulfill({ status: state.failure, contentType: 'application/json', body: JSON.stringify({ detail: 'Synthetic session-check failure' }) });
        return route.fulfill({ status: 200, json: fixtureUser });
      }
      if (apiPath === '/auth/login') {
        state.loginRequests++;
        const data = new URLSearchParams(request.postData() || '');
        assert.equal(data.get('username'), fixtureUser.email);
        assert.equal(data.get('password'), 'synthetic-password');
        return route.fulfill({ status: 200, json: { access_token: loginToken, token_type: 'bearer' } });
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) state.unexpectedWrites.push(`${request.method()} ${apiPath}`);
      return route.fulfill({ status: 200, json: [] });
    }
    if (url.origin !== origin && ['http:', 'https:'].includes(url.protocol)) return route.abort('blockedbyclient');
    return route.continue();
  });
  return { page, context, state };
}

async function storedToken(page) { return page.evaluate(key => localStorage.getItem(key), tokenKey); }
async function recovery(page, timeout = 6000) {
  await page.getByText('Не удалось проверить сессию', { exact: true }).waitFor({ state: 'visible', timeout });
  await page.getByRole('button', { name: /^Повторить$/ }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('input[type="password"]').count(), 0, 'Recovery must not display the login form');
}
async function profileReady(page) {
  await page.getByRole('heading', { name: fixtureUser.name, exact: true }).waitFor({ state: 'visible' });
  assert.equal(new URL(page.url()).pathname, '/profile', 'Recovery must preserve the original route');
}

async function runCase(browser, name, fn, opts = {}) {
  if (caseFilter && !caseFilter.test(name)) return;
  const started = Date.now();
  const session = await setup(browser, opts.initialToken === undefined ? savedToken : opts.initialToken, opts.failure === undefined ? 503 : opts.failure, opts.ignoreProfileAbort || false);
  try {
    await fn(session);
    assert.deepEqual(session.state.unexpectedWrites, [], 'No unexpected application mutations');
    assert.deepEqual(session.state.pageErrors, [], 'No uncaught browser errors');
    results.push({ name, status: 'passed', durationMs: Date.now() - started, profileRequests: session.state.meRequests.length });
    console.log(`PASS ${name}`);
  } catch (error) {
    const screenshot = path.join(outputDir, `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
    await session.page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
    results.push({ name, status: 'failed', durationMs: Date.now() - started, message: error.message, screenshot });
    console.error(`FAIL ${name}: ${error.message}`);
  } finally {
    await session.context.close();
  }
}

(async () => {
  const launchOptions = { headless: true };
  if (process.env.CHROMIUM_EXECUTABLE) launchOptions.executablePath = process.env.CHROMIUM_EXECUTABLE;
  else if (fs.existsSync(chromium.executablePath())) launchOptions.executablePath = chromium.executablePath();
  else launchOptions.channel = 'chrome';
  const browser = await chromium.launch(launchOptions);
  console.log(`Browser ${browser.version()}; target ${origin}; every API request is mocked.`);
  try {
    for (const failure of ['network', 500, 502, 503]) {
      await runCase(browser, `saved token survives ${failure} and manual retry`, async ({ page, state }) => {
        await page.goto(`${origin}/profile?session-regression=1`);
        await recovery(page);
        assert.equal(await storedToken(page), savedToken);
        assert.equal(new URL(page.url()).pathname, '/profile');
        await page.reload();
        await recovery(page);
        assert.equal(await storedToken(page), savedToken, 'Transient failure must preserve token across a real reload');
        state.failure = null;
        await page.getByRole('button', { name: /^Повторить$/ }).click();
        await profileReady(page);
        assert.equal(new URL(page.url()).search, '?session-regression=1');
        assert.equal(await storedToken(page), savedToken);
        assert(state.meRequests.every(request => request.authorization === `Bearer ${savedToken}`));
      }, { failure });
    }
    await runCase(browser, '401 clears expired token and opens login', async ({ page }) => {
      await page.goto(`${origin}/profile`);
      await page.locator('input[type="password"]').waitFor({ state: 'visible' });
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(await storedToken(page), null);
      assert.equal(await page.getByRole('button', { name: /^Повторить$/ }).count(), 0);
    }, { failure: 401 });
    await runCase(browser, 'post-login profile outage retains newly issued token', async ({ page, state }) => {
      await page.goto(origin);
      await page.getByLabel('Email', { exact: true }).fill(fixtureUser.email);
      await page.getByLabel('Пароль', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: /^Войти$/ }).click();
      await recovery(page);
      assert.equal(state.loginRequests, 1);
      assert.equal(await storedToken(page), loginToken);
      state.failure = null;
      await page.getByRole('button', { name: /^Повторить$/ }).click();
      await page.waitForURL(url => url.pathname === '/dashboard');
      await page.getByRole('heading', { name: /^Добрый день/ }).waitFor({ state: 'visible' });
      assert.equal(await storedToken(page), loginToken);
      assert(state.meRequests.every(request => request.authorization === `Bearer ${loginToken}`));
      assert.equal(state.loginRequests, 1, 'Recovery must not submit credentials again');
    }, { initialToken: null });
    await runCase(browser, 'anonymous user can log in normally', async ({ page, state }) => {
      await page.goto(`${origin}/profile`);
      await page.locator('input[type="password"]').waitFor({ state: 'visible' });
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(state.meRequests.length, 0, 'Anonymous initialization must not call profile endpoint');
      await page.getByLabel('Email', { exact: true }).fill(fixtureUser.email);
      await page.getByLabel('Пароль', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: /^Войти$/ }).click();
      await page.waitForURL(url => url.pathname === '/dashboard');
      await page.getByRole('heading', { name: /^Добрый день/ }).waitFor({ state: 'visible' });
      assert.equal(await storedToken(page), loginToken);
      assert.equal(state.loginRequests, 1);
    }, { initialToken: null, failure: null });
    await runCase(browser, 'hung profile request times out and retains session', async ({ page, state }) => {
      await page.goto(`${origin}/profile`);
      await poll(() => state.pendingProfiles.length > 0, 'Profile request did not start');
      await recovery(page, 20000);
      assert.equal(await storedToken(page), savedToken);
      assert.equal(new URL(page.url()).pathname, '/profile');
      state.failure = null;
      await page.getByRole('button', { name: /^Повторить$/ }).click();
      await profileReady(page);
      assert.equal(await storedToken(page), savedToken);
    }, { failure: 'pending' });
    await runCase(browser, 'online event retries the retained session', async ({ page, state }) => {
      await page.goto(`${origin}/profile`);
      await recovery(page);
      state.failure = null;
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await profileReady(page);
      assert.equal(await storedToken(page), savedToken);
    });
    await runCase(browser, 'automatic retry recovers without user interaction', async ({ page, state }) => {
      await page.goto(`${origin}/profile`);
      await recovery(page);
      const previousCount = state.meRequests.length;
      state.failure = null;
      await poll(() => state.meRequests.length > previousCount, 'Automatic retry did not run', 15000);
      await profileReady(page);
      assert.equal(await storedToken(page), savedToken);
    });
    await runCase(browser, 'explicit exit clears retained token during outage', async ({ page }) => {
      await page.goto(`${origin}/profile`);
      await recovery(page);
      await page.getByRole('button', { name: /^Выйти$/ }).click();
      await page.locator('input[type="password"]').waitFor({ state: 'visible' });
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(await storedToken(page), null);
    });
    await runCase(browser, 'logout while retry pending ignores late successful profile', async ({ page, state }) => {
      await page.goto(`${origin}/profile`);
      await recovery(page);
      state.failure = 'pending';
      await page.getByRole('button', { name: /^Повторить$/ }).click();
      await poll(() => state.pendingProfiles.length > 0, 'Retry request did not start');
      await page.getByRole('button', { name: /^Выйти$/ }).click();
      await page.locator('input[type="password"]').waitFor({ state: 'visible' });
      assert.equal(await storedToken(page), null);
      // This scenario deliberately ignores AbortSignal for /me, forcing a real late
      // success response to exercise the stale-result guard as well as cancellation.
      for (const route of state.pendingProfiles) await route.fulfill({ status: 200, json: fixtureUser });
      await page.waitForTimeout(500);
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(await storedToken(page), null);
      assert.equal(await page.locator('input[type="password"]').isVisible(), true);
    }, { ignoreProfileAbort: true });
  } finally { await browser.close(); }
  assert(results.length > 0, 'CASE_FILTER matched no tests');
  fs.writeFileSync(path.join(outputDir, reportName), JSON.stringify({ baseUrl: origin, results }, null, 2) + '\n');
  console.log(`${results.filter(result => result.status === 'passed').length}/${results.length} passed`);
  if (results.some(result => result.status === 'failed')) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
