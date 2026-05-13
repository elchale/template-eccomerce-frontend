import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './__tests__/msw/server';

// Provide test-time defaults for env vars consumed by components under test.
// Vite normally injects these at build; vitest does not, so any component that
// reads `import.meta.env.VITE_*` would otherwise see undefined.
import.meta.env.VITE_IZIPAY_PUBLIC_KEY = 'test-public-key';

// ── MSW lifecycle ────────────────────────────────────────────────────────────
// Default handlers come from src/__tests__/msw/handlers.ts. Tests can override
// per-test via `server.use(...)`.
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
