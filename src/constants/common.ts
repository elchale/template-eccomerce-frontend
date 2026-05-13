const PROJECT_NAME_ENV =
    (import.meta.env.VITE_PROJECT_NAME as string | undefined) ?? 'Qolca Solutions';

export const LOGO = {
    src: '/logo.svg',
    alt: `${PROJECT_NAME_ENV} Logo`,
};

export const PROJECT_NAME = PROJECT_NAME_ENV;
