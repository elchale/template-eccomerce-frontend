/**
 * MSW server for Node-based vitest tests. Import handlers from `./handlers.ts`
 * and pass them in — keeps the server itself slim and reusable.
 */
import { setupServer } from 'msw/node';

import { handlers } from './handlers';

export const server = setupServer(...handlers);
