/**
 * Default MSW handlers used by every test that imports `server`.
 * Individual tests can override per-test with `server.use(http.get(...))`.
 *
 * Patterns use leading `*` so they match against any base URL — tests run with
 * relative axios paths against the jsdom origin, so absolute URLs vary.
 */
import { http, HttpResponse } from 'msw';

export const handlers = [
    // ── Auth ──────────────────────────────────────────────────────────────────
    http.post('*/auth/login/', async ({ request }) => {
        const body = (await request.json()) as { email: string; password: string };
        if (body.email === 'fail@example.com') {
            return HttpResponse.json({ message: ['wrong_data'] }, { status: 400 });
        }
        return HttpResponse.json({
            access: 'test-access-token',
            refresh: 'test-refresh-token',
            user: {
                username: 'test',
                email: body.email,
                first_name: 'Test',
                last_name: 'User',
                is_staff: false,
            },
        });
    }),

    http.post('*/auth/token/refresh/', () =>
        HttpResponse.json({ access: 'refreshed-access-token', refresh: 'refreshed-refresh-token' }),
    ),

    http.post('*/auth/logout/', () => HttpResponse.json({ detail: 'Logged out.' })),

    // ── Profile ───────────────────────────────────────────────────────────────
    http.get('*/api/auth/profile/', () =>
        HttpResponse.json({
            id: 1,
            username: 'test',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            is_active: true,
        }),
    ),

    // ── Cart ──────────────────────────────────────────────────────────────────
    http.get('*/api/cart/', () =>
        HttpResponse.json({
            id: 1,
            items: [],
            subtotal: '0.00',
            item_count: 0,
        }),
    ),
];
