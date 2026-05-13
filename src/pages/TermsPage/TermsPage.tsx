import { useTranslation } from 'react-i18next';

import { PROJECT_NAME } from '@/constants/common';

import styles from './TermsPage.module.css';

/** Section indices for the Terms layout. Each maps to `terms_section_{n}_*`
 *  keys in `public/locales/{lang}/legal.json`. */
const TERMS_SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** `/terms` — Terms of Service page. Content driven from the `legal`
 *  i18n namespace; numbered sections render via a single map over
 *  `TERMS_SECTIONS`. */
export function TermsPage() {
    const { t } = useTranslation('legal');

    return (
        <main className={styles.page}>
            <article className={styles.container}>
                <header className={styles.header}>
                    <h1>{t('terms_title')}</h1>
                    <p className={styles.updated}>{t('terms_updated')}</p>
                </header>

                {TERMS_SECTIONS.map((n) => (
                    <section key={n} className={styles.section}>
                        <h2>{t(`terms_${n}_title`)}</h2>
                        {n === 12 ? (
                            <p>
                                {t('terms_12_body')}{' '}
                                <a href={`mailto:${t('terms_contact_email')}`}>
                                    {t('terms_contact_email')}
                                </a>
                                .
                            </p>
                        ) : (
                            <p>{t(`terms_${n}_body`, { name: PROJECT_NAME })}</p>
                        )}
                    </section>
                ))}
            </article>
        </main>
    );
}
