import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { API_ROUTES, ROUTES, buildRoute } from '../constants/routes';

/**
 * Route-consistency guardrail.
 *
 * Makes broken/mismatched routes impossible to ship: every URL-path key in the
 * ROUTES dict must resolve to a <Route> registered in App.tsx (either directly
 * via `path={ROUTES.x}` or, for the admin section, via the `/admin` parent +
 * its relative nested children). If anyone adds a ROUTES key without wiring a
 * route — or removes a route a key still points at — this test fails.
 *
 * It parses the App.tsx source rather than rendering, so it stays fast and
 * doesn't need the full provider tree.
 */

// Vitest runs with cwd = frontend root, so App.tsx lives at src/App.tsx.
const APP_SOURCE = readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf8');

/** ROUTES keys whose values are NOT navigable URL paths handled here. */
const NON_PATH_KEYS = new Set<keyof typeof ROUTES>([
    // '*' catch-all — asserted separately below.
    'notFound',
]);

/**
 * The admin section registers its children as paths RELATIVE to `/admin`
 * (e.g. `path="products"`), so they never appear as `path={ROUTES.adminX}`.
 * We resolve those by reconstructing the absolute path from the parent + the
 * relative `path="..."` strings found inside App.tsx.
 */
function registeredAbsolutePaths(): Set<string> {
    const paths = new Set<string>();

    // 1. Direct registrations: path={ROUTES.someKey}
    const routeKeyRefs = APP_SOURCE.matchAll(/path=\{ROUTES\.(\w+)\}/g);
    for (const match of routeKeyRefs) {
        const key = match[1] as keyof typeof ROUTES;
        const value = ROUTES[key];
        if (typeof value === 'string') paths.add(value);
    }

    // 2. Literal nested registrations: path="relative/segment"
    //    These live under the `/admin` parent route, so prefix accordingly.
    const literalRefs = APP_SOURCE.matchAll(/path="([^"]+)"/g);
    for (const match of literalRefs) {
        const relative = match[1];
        paths.add(`${ROUTES.admin}/${relative}`);
    }

    return paths;
}

describe('route consistency: ROUTES dict <-> App.tsx router', () => {
    const registered = registeredAbsolutePaths();

    const pathKeys = (Object.keys(ROUTES) as (keyof typeof ROUTES)[]).filter(
        (key) => !NON_PATH_KEYS.has(key),
    );

    it.each(pathKeys)('ROUTES.%s resolves to a registered <Route>', (key) => {
        const value = ROUTES[key];
        // If this fails: ROUTES.<key> has no matching <Route> in App.tsx —
        // either register a route for it or remove the dead key.
        expect(registered.has(value)).toBe(true);
    });

    it('the "*" catch-all NotFound route is registered', () => {
        expect(APP_SOURCE).toContain('path={ROUTES.notFound}');
        expect(ROUTES.notFound).toBe('*');
    });

    it('the removed dead "shop" key is not referenced anywhere in ROUTES', () => {
        expect('shop' in ROUTES).toBe(false);
    });

    it('every buildRoute output starts with a slash (internal path)', () => {
        expect(buildRoute.shopCategory('x')).toMatch(/^\//);
        expect(buildRoute.shopProduct('x')).toMatch(/^\//);
        expect(buildRoute.orderDetail('x')).toMatch(/^\//);
        expect(buildRoute.adminProductEdit(1)).toMatch(/^\//);
        expect(buildRoute.adminOrderDetail(1)).toMatch(/^\//);
        expect(buildRoute.adminMarketingPromoEdit(1)).toMatch(/^\//);
        expect(buildRoute.adminMarketingBannerEdit(1)).toMatch(/^\//);
        expect(buildRoute.adminMarketingPopupEdit(1)).toMatch(/^\//);
    });
});

/**
 * Django convention: every API path ends with `/`. APPEND_SLASH=True turns a
 * slash-less POST into a 301 redirect, which browsers follow as a GET — and
 * the backend then rejects with 405. Caused a silent prod outage on the
 * checkout/pay endpoint once; never again. This test enforces the convention
 * across every API_ROUTES entry (both string literals and URL builders).
 */
describe('API_ROUTES: trailing-slash invariant (Django APPEND_SLASH)', () => {
    const STRING_ENTRIES = Object.entries(API_ROUTES).filter(
        ([, v]) => typeof v === 'string',
    ) as [string, string][];

    const FUNCTION_ENTRIES = Object.entries(API_ROUTES).filter(
        ([, v]) => typeof v === 'function',
    ) as [string, (...args: unknown[]) => string][];

    it.each(STRING_ENTRIES)('API_ROUTES.%s starts and ends with /', (_key, value) => {
        expect(value.startsWith('/')).toBe(true);
        expect(value.endsWith('/')).toBe(true);
    });

    it.each(FUNCTION_ENTRIES)('API_ROUTES.%s(...) starts and ends with /', (_key, fn) => {
        // Call with safe stand-ins that work for both string and number params.
        const sample = fn('sample-token-123' as never);
        expect(typeof sample).toBe('string');
        expect(sample.startsWith('/')).toBe(true);
        expect(sample.endsWith('/')).toBe(true);
    });
});

/**
 * Anti-hardcode guard. Every hook in `src/api/` and every Zustand store in
 * `src/stores/` must pass the URL via `API_ROUTES.x` — never an inline
 * `'/api/...'` or `'/auth/...'` literal. An inline string is exactly how the
 * checkout/pay trailing-slash bug shipped: nothing tied the call site to the
 * single source of truth, so the convention drifted. This test scans those
 * folders and fails on any new offender.
 */
describe('api hooks + stores never hardcode URL literals', () => {
    const ROOTS = ['src/api', 'src/stores'];
    const SCAN_EXT = new Set(['.ts', '.tsx']);

    function collectFiles(dir: string, out: string[] = []): string[] {
        if (!statSync(path.join(process.cwd(), dir), { throwIfNoEntry: false })) return out;
        for (const entry of readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
            const rel = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                collectFiles(rel, out);
            } else if (SCAN_EXT.has(path.extname(entry.name))) {
                out.push(rel);
            }
        }
        return out;
    }

    const files = ROOTS.flatMap((r) => collectFiles(r));

    it.each(files)('%s has no inline /api/ or /auth/ string literal', (rel) => {
        const source = readFileSync(path.join(process.cwd(), rel), 'utf8');
        // Strip comments so a doc example doesn't trip the check.
        const stripped = source
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');
        const offender = /['"`]\/(?:api|auth|resend)\//.exec(stripped);
        // If this fails: replace the literal with `API_ROUTES.something`. If
        // the path doesn't have an entry yet, ADD one to `constants/routes.ts`.
        expect(offender, `inline URL literal in ${rel}: ${offender?.[0]}`).toBeNull();
    });
});
