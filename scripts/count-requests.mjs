/**
 * Open http://localhost:5174 in headless Chromium, log every network
 * request the browser fires, then print a categorized summary.
 *
 *   node scripts/count-requests.mjs           # cold load, no localStorage
 *   node scripts/count-requests.mjs --stale   # simulate stale localStorage.user
 *
 * Counts are split into:
 *   - "API" (fetch/xhr to our backend at :8000 or same-origin /api|/auth)
 *   - "Modules" (Vite-served .ts/.tsx/.js/.mjs files)
 *   - "Style/Font/Image" (CSS, woff, png, svg, etc.)
 *   - "Other"
 *
 * Top duplicate URLs are highlighted so any actual API hammering shows up.
 */
import { chromium } from 'playwright';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5174/';
const STALE = process.argv.includes('--stale');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const requests = [];

page.on('request', (req) => {
    const headers = req.headers();
    requests.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        status: null,
        acceptLang: headers['accept-language'] || '',
        timestamp: Date.now(),
    });
});

page.on('response', (resp) => {
    const last = requests.find((r) => r.url === resp.url() && r.status === null);
    if (last) last.status = resp.status();
});

// Optionally seed stale localStorage like a returning visitor would have.
if (STALE) {
    await page.addInitScript(() => {
        localStorage.setItem(
            'USER',
            JSON.stringify({
                id: 99,
                email: 'stale@example.com',
                first_name: 'Stale',
                last_name: 'User',
                is_staff: false,
            }),
        );
        // No access token, no refresh cookie — simulates leftover from a prior login
        // that's since fully expired.
    });
}

const t0 = Date.now();
await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
const t1 = Date.now();

// Wait a beat for anything kicked off after networkidle
await page.waitForTimeout(2000);

const consoleMessages = [];
page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    }
});
page.on('requestfailed', (req) => {
    consoleMessages.push(
        `[FAIL] ${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'unknown'}`,
    );
});

await page.waitForTimeout(1500);
const consoleErrors = consoleMessages;
await browser.close();

// ----- summarize -----

const byType = {};
const apiByUrl = {};
const otherByUrl = {};
let api = 0,
    modules = 0,
    assets = 0,
    other = 0;

for (const r of requests) {
    byType[r.resourceType] = (byType[r.resourceType] || 0) + 1;

    const u = new URL(r.url);
    const path = u.pathname + u.search;

    const isApi = u.host.includes(':8000') || path.startsWith('/api/') || path.startsWith('/auth/');
    const isModule =
        r.resourceType === 'script' && (u.host.includes(':5174') || u.host === 'localhost');
    const isAsset = ['stylesheet', 'font', 'image'].includes(r.resourceType);

    if (isApi) {
        api++;
        apiByUrl[path] = (apiByUrl[path] || 0) + 1;
    } else if (isModule) {
        modules++;
    } else if (isAsset) {
        assets++;
        otherByUrl[r.resourceType] = (otherByUrl[r.resourceType] || 0) + 1;
    } else {
        other++;
        otherByUrl[r.resourceType] = (otherByUrl[r.resourceType] || 0) + 1;
    }
}

console.log('====================================================');
console.log(`page.goto → networkidle took ${t1 - t0}ms`);
console.log(`stale localStorage seeded: ${STALE ? 'YES' : 'no'}`);
console.log('----------------------------------------------------');
console.log(`TOTAL requests: ${requests.length}`);
console.log(`  API (Django):    ${api}`);
console.log(`  Vite modules:    ${modules}`);
console.log(`  Assets (css/font/img): ${assets}`);
console.log(`  Other:           ${other}`);
console.log('');
console.log('By resourceType:');
for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t.padEnd(20)} ${n}`);
}
console.log('');
console.log('API calls (sorted by count):');
const sortedApi = Object.entries(apiByUrl).sort((a, b) => b[1] - a[1]);
for (const [path, count] of sortedApi) {
    const flag = count > 2 ? ' ⚠️ ' : '';
    console.log(`  ${count}× ${path}${flag}`);
}
console.log('');
console.log('API request detail (timing method status url):');
const baseTime = requests[0]?.timestamp ?? 0;
for (const r of requests) {
    const u = new URL(r.url);
    const path = u.pathname + u.search;
    const isApi = u.host.includes(':8000') || path.startsWith('/api/') || path.startsWith('/auth/');
    if (isApi) {
        const dt = String(r.timestamp - baseTime).padStart(5, ' ');
        const lang = r.acceptLang.padEnd(8);
        console.log(
            `  +${dt}ms ${r.method.padEnd(6)} ${String(r.status ?? '?').padEnd(5)} AL=${lang} ${u.host}${path}`,
        );
    }
}
console.log('');
if (consoleErrors.length) {
    console.log(`Console errors (${consoleErrors.length}):`);
    for (const e of consoleErrors.slice(0, 10)) console.log(`  ${e.slice(0, 200)}`);
}
console.log('====================================================');
