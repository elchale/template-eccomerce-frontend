import { Button } from '@/components/ui';
import { useModalStore } from '@/stores/useModalStore';

import styles from './ExampleModal.module.css';

interface ExampleModalProps {
    title?: string;
    message?: string;
    handleClose?: () => void;
}

export function ExampleModal({
    title = 'Example Modal',
    message = 'This is an example modal component.',
}: ExampleModalProps) {
    const closeModal = useModalStore((s) => s.closeModal);

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.message}>{message}</p>

            <div className={styles.actions}>
                <Button variant="secondary" onClick={closeModal}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={closeModal}>
                    Confirm
                </Button>
            </div>
        </div>
    );
}
