export const LANGUAGES = [
    { code: 'es', label: 'Español', flag: '🇵🇪' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
