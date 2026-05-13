import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import styles from './CookieConsent.module.css';

const CONSENT_KEY = 'cookie-consent';

type ConsentValue = 'accepted' | 'rejected';

function getStoredConsent(): ConsentValue | null {
    try {
        const stored = localStorage.getItem(CONSENT_KEY);
        if (stored === 'accepted' || stored === 'rejected') return stored;
    } catch {
        // localStorage unavailable (e.g. private browsing strict mode)
    }
    return null;
}

function storeConsent(value: ConsentValue): void {
    try {
        localStorage.setItem(CONSENT_KEY, value);
    } catch {
        // ignore
    }
}

/**
 * Cookie consent banner (GDPR v1 — binary Accept / Reject).
 *
 * Mounts once at the app root. Disappears permanently after the user
 * makes a choice; the choice is persisted in `localStorage` under
 * `cookie-consent`. Analytics scripts (none currently implemented)
 * should check `localStorage.getItem('cookie-consent') === 'accepted'`
 * before initialising.
 */
export function CookieConsent() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!getStoredConsent()) {
            setVisible(true);
        }
    }, []);

    if (!visible) return null;

    const handleAccept = () => {
        storeConsent('accepted');
        setVisible(false);
        toast.success(t('cookie_accepted'), { duration: 3000 });
    };

    const handleReject = () => {
        storeConsent('rejected');
        setVisible(false);
    };

    return (
        <div className={styles.banner} role="dialog" aria-modal="false" aria-live="polite">
            <div className={styles.content}>
                <p className={styles.title}>{t('cookie_banner_title')}</p>
                <p className={styles.body}>{t('cookie_banner_body')}</p>
            </div>
            <div className={styles.actions}>
                <button className={styles.rejectBtn} onClick={handleReject} type="button">
                    {t('cookie_reject_optional')}
                </button>
                <button className={styles.acceptBtn} onClick={handleAccept} type="button">
                    {t('cookie_accept_all')}
                </button>
            </div>
        </div>
    );
}
