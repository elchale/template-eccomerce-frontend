/**
 * Current user's profile. Disabled when `isLogged === false` to avoid a
 * pointless 401 on logout. 5-minute staleTime since the profile rarely
 * changes mid-session.
 */
import { useQuery } from '@tanstack/react-query';

import { API_ROUTES } from '@/constants/routes';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import type { UserProfile } from '@/types/user';

export type { UserProfile };

export const PROFILE_KEYS = {
    all: ['profile'] as const,
    me: () => [...PROFILE_KEYS.all, 'me'] as const,
} as const;

const fetchProfile = async (): Promise<UserProfile> => {
    const { data } = await api.get<UserProfile>(API_ROUTES.profile);
    return data;
};

/** Authenticated `/me` profile. Returns `data: undefined` while logged out. */
export const useProfile = () => {
    const isLogged = useAuthStore((state) => state.isLogged);

    return useQuery<UserProfile>({
        queryKey: PROFILE_KEYS.me(),
        queryFn: fetchProfile,
        enabled: isLogged,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};
