import { Component, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './ErrorBoundary.module.css';

/**
 * React error boundary with route-driven auto-reset (FE-7).
 *
 * `resetKey` lets parent code clear the boundary when navigation happens —
 * pass `location.pathname` or `location.key` from a parent component so a
 * crash on one route doesn't leak its error UI into the next route. The
 * boundary is class-based because there is still no hooks-equivalent in
 * React 19 for `componentDidCatch` / `getDerivedStateFromError`.
 *
 * Pass a custom `fallback` to override the default UI for sub-trees that
 * need contextual recovery (e.g., admin pages with their own layout).
 */

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    /** FE-7: changing this value resets the error boundary (e.g. on route change) */
    resetKey?: string | number;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

interface FallbackProps {
    error: Error | null;
    onRetry: () => void;
}

function DefaultFallback({ error, onRetry }: FallbackProps) {
    const { t } = useTranslation();
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.icon} aria-hidden="true">
                    ⚠
                </div>
                <h2 className={styles.title}>{t('error_generic_title')}</h2>
                <p className={styles.message}>{t('error_generic_message')}</p>
                {!!error && <p className={styles.detail}>{error.message}</p>}
                <button type="button" className={styles.retryButton} onClick={onRetry}>
                    {t('retry')}
                </button>
            </div>
        </div>
    );
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    // FE-7: reset the boundary when the resetKey prop changes (e.g. route navigation)
    override componentDidUpdate(prevProps: Props) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false, error: null });
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    override render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return <DefaultFallback error={this.state.error} onRetry={this.handleRetry} />;
        }

        return this.props.children;
    }
}
