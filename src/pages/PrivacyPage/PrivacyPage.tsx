import { useTranslation } from 'react-i18next';

import { PROJECT_NAME } from '@/constants/common';

import styles from './PrivacyPage.module.css';

/** `/privacy` — static legal page. Body content lives in the `legal` i18n
 *  namespace so translators can maintain the three localized versions. */
export function PrivacyPage() {
    const { t } = useTranslation('legal');

    return (
        <main className={styles.page}>
            <article className={styles.container}>
                <header className={styles.header}>
                    <h1>{t('privacy_title')}</h1>
                    <p className={styles.updated}>{t('privacy_updated')}</p>
                </header>

                <section className={styles.section}>
                    <h2>{t('privacy_1_title')}</h2>
                    <p>{t('privacy_1_body', { name: PROJECT_NAME })}</p>
                </section>

                <section className={styles.section}>
                    <h2>{t('privacy_2_title')}</h2>
                    <p>{t('privacy_2_intro')}</p>
                    <ul>
                        <li>{t('privacy_2_item_1')}</li>
                        <li>{t('privacy_2_item_2')}</li>
                        <li>{t('privacy_2_item_3')}</li>
                        <li>{t('privacy_2_item_4')}</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>{t('privacy_3_title')}</h2>
                    <ul>
                        <li>{t('privacy_3_item_1')}</li>
                        <li>{t('privacy_3_item_2')}</li>
                        <li>{t('privacy_3_item_3')}</li>
                        <li>{t('privacy_3_item_4')}</li>
                        <li>{t('privacy_3_item_5')}</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>{t('privacy_4_title')}</h2>
                    <p>{t('privacy_4_body')}</p>
                </section>

                <section className={styles.section}>
                    <h2>{t('privacy_5_title')}</h2>
                    <p>{t('privacy_5_body')}</p>
                </section>

                <section className={styles.section}>
                    <h2>{t('privacy_6_title')}</h2>
                    <p>{t('privacy_6_body')}</p>
                </section>

                <section className={styles.section}>
                    <h2>{t('privacy_7_title')}</h2>
                    <p>{t('privacy_7_body')}</p>
                </section>

                <section className={styles.section}>
                    <h2>{t('privacy_8_title')}</h2>
                    <p>{t('privacy_8_body')}</p>
                </section>

                <section className={styles.section}>
                    <h2>{t('privacy_9_title')}</h2>
                    <p>
                        {t('privacy_9_body')}{' '}
                        <a href={`mailto:${t('privacy_contact_email')}`}>
                            {t('privacy_contact_email')}
                        </a>
                        .
                    </p>
                </section>
            </article>
        </main>
    );
}
