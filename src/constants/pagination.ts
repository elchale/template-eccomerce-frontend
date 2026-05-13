/**
 * Pagination defaults. Mirrors backend DRF settings (LimitOffset, 10 per page, max 100).
 */
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
} as const;
