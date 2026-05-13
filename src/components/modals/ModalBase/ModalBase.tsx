import { X } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useEscapeKey, useFocusTrap } from '@/hooks';
import { useModalStore } from '@/stores/useModalStore';

import styles from './ModalBase.module.css';

/**
 * The single mount point for the global modal system. Reads `content` from
 * `useModalStore` and renders it inside a WAI-ARIA `dialog` with:
 *  - Focus trap (`useFocusTrap`) — keyboard navigation can't escape the dialog.
 *  - Escape key handler (`useEscapeKey`) — closes from any focused descendant.
 *  - Body scroll lock — prevents background scrolling on iOS / desktop.
 *  - Auto-close on route change — back/forward dismisses the modal.
 *  - Overlay click + Enter/Space activation on overlay → close.
 *
 * The two-phase `isOpen` / `isClosing` flags drive the CSS transition; we
 * keep the DOM mounted during the closing animation, then `useModalStore`
 * unmounts it after `ANIMATION_DURATION`.
 */
export function ModalBase() {
    const { t } = useTranslation();
    const isModalOpen = useModalStore((state) => state.isOpen);
    const isClosing = useModalStore((state) => state.isClosing);
    const closeModal = useModalStore((state) => state.closeModal);
    const modalContent = useModalStore((state) => state.content);

    const location = useLocation();
    const contentRef = useRef<HTMLDivElement>(null);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    };

    // Close on Escape regardless of which element inside the modal has focus.
    useEscapeKey(closeModal, isModalOpen && !isClosing);

    // Focus trap + return on close.
    useFocusTrap(contentRef, isModalOpen && !isClosing);

    // Close modal on route change.
    useEffect(() => {
        if (isModalOpen && !isClosing) {
            closeModal();
        }
    }, [location.pathname, isModalOpen, isClosing, closeModal]);

    // Lock body scroll while the modal is open.
    useEffect(() => {
        if (!isModalOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isModalOpen]);

    if (!isModalOpen && !isClosing) return null;

    return (
        <div
            className={`${styles.overlay} ${isClosing ? styles.closing : ''}`}
            onClick={handleOverlayClick}
            onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                    e.preventDefault();
                    closeModal();
                }
            }}
            role="button"
            tabIndex={-1}
            aria-label={t('close')}
        >
            <div ref={contentRef} className={styles.content} role="dialog" aria-modal="true">
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={closeModal}
                    aria-label={t('close')}
                >
                    <X size={24} />
                </button>
                {!!modalContent && <div>{modalContent}</div>}
            </div>
        </div>
    );
}
