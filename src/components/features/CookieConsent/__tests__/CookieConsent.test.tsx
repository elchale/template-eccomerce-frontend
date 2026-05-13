import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { CookieConsent } from '../CookieConsent';

// Without i18n init, useTranslation falls back: t('key') returns the key itself.
// All assertions use the translation key strings directly.

const CONSENT_KEY = 'cookie-consent';

describe('CookieConsent', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renders the banner when no consent is stored', () => {
        render(<CookieConsent />);
        // The banner should be visible (aria live region or role dialog)
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when consent is already stored (accepted)', () => {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        render(<CookieConsent />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('does not render when consent is already stored (rejected)', () => {
        localStorage.setItem(CONSENT_KEY, 'rejected');
        render(<CookieConsent />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('stores "accepted" in localStorage when accept button is clicked', () => {
        render(<CookieConsent />);
        const acceptBtn = screen.getByRole('button', { name: /cookie_accept_all/i });
        fireEvent.click(acceptBtn);
        expect(localStorage.getItem(CONSENT_KEY)).toBe('accepted');
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('stores "rejected" in localStorage when reject button is clicked', () => {
        render(<CookieConsent />);
        const rejectBtn = screen.getByRole('button', { name: /cookie_reject_optional/i });
        fireEvent.click(rejectBtn);
        expect(localStorage.getItem(CONSENT_KEY)).toBe('rejected');
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
