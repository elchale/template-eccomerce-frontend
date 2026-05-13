/**
 * Global modal store. There is exactly one modal slot in the app —
 * `ModalRoot` reads `content` and renders it in a portal with focus trap
 * and Escape handling.
 *
 * `closeModal` defers unmounting by `ANIMATION_DURATION` so CSS transitions
 * can play out. The two-phase `isOpen` / `isClosing` flags drive the
 * enter/exit animation classes; consumers shouldn't read them directly.
 *
 * If a modal renders content with a `handleClose` prop, the store invokes
 * it on close — used to reset form state in parent components without
 * coupling them to the modal lifecycle.
 */
import type { ReactElement } from 'react';
import { create } from 'zustand';

/** Match the CSS transition duration on `.modalOverlay`. */
const ANIMATION_DURATION = 200;

interface ModalContentProps {
    handleClose?: () => void;
}

interface ModalState {
    isOpen: boolean;
    isClosing: boolean;
    content: ReactElement<ModalContentProps> | null;
}

interface ModalActions {
    openModal: (content: ReactElement<ModalContentProps>) => void;
    closeModal: () => void;
    _resetModal: () => void;
}

type ModalStore = ModalState & ModalActions;

export const useModalStore = create<ModalStore>()((set, get) => ({
    // State
    isOpen: false,
    isClosing: false,
    content: null,

    // Actions
    openModal: (content) => set({ isOpen: true, isClosing: false, content }),
    closeModal: () => {
        const { isClosing, content } = get();
        if (isClosing) return; // Prevent double-close

        // Call handleClose prop if exists
        if (content && typeof content.props.handleClose === 'function') {
            content.props.handleClose();
        }

        set({ isClosing: true });
        setTimeout(() => {
            set({ isOpen: false, isClosing: false, content: null });
        }, ANIMATION_DURATION);
    },
    _resetModal: () => set({ isOpen: false, isClosing: false, content: null }),
}));
