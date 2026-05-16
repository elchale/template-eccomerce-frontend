/**
 * React Query hooks for the admin Email Log feature.
 *
 * KEYS factory — admin keys are NOT language-scoped (consistent with useAdmin.ts).
 *
 * useAdminEmailLogs(params)  — paginated list (status + email_type filter)
 * useRetryEmailLog()         — POST retry mutation; invalidates EMAIL_LOG_KEYS.all
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import type { EmailLog } from '@/types/emailLog';
import type { PaginatedResponse } from '@/types/product';

export const EMAIL_LOG_KEYS = {
    all: ['admin', 'email-logs'] as const,
    list: (params?: Record<string, string>) =>
        [...EMAIL_LOG_KEYS.all, 'list', params] as const,
} as const;

/**
 * Paginated list of email logs.
 * Accepts: limit, offset, status (pending|retrying|confirmed|failed), email_type.
 */
export function useAdminEmailLogs(params?: Record<string, string>) {
    return useQuery({
        queryKey: EMAIL_LOG_KEYS.list(params),
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<EmailLog>>(
                API_ROUTES.adminEmailLogs,
                { params },
            );
            return data;
        },
    });
}

/**
 * Retry mutation — POSTs to the retry endpoint for a given log id.
 * On success, invalidates the full EMAIL_LOG_KEYS.all tree so the list refetches.
 */
export function useRetryEmailLog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { data } = await api.post<EmailLog>(API_ROUTES.adminEmailLogRetry(id), {});
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EMAIL_LOG_KEYS.all });
        },
    });
}
