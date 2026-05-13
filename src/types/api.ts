/**
 * Shared API envelope shapes used across multiple domain types.
 */

/**
 * DRF LimitOffsetPagination envelope.
 */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
