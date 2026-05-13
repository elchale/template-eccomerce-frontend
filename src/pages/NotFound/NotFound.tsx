import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui';
import { ROUTES } from '@/constants/routes';

import styles from './NotFound.module.css';

/** Catch-all 404 page mounted on `path="*"` in the router. */
export function NotFound() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1>404</h1>
                <h2>{t('not_found_title')}</h2>
                <p>{t('not_found_message')}</p>
                <Button variant="primary" onClick={() => navigate(ROUTES.home)}>
                    {t('not_found_back')}
                </Button>
            </div>
        </div>
    );
}
