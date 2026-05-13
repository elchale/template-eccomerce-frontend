import styles from './QuantitySelector.module.css';

interface QuantitySelectorProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
}

export function QuantitySelector({ value, onChange, min = 1, max = 99 }: QuantitySelectorProps) {
    const handleDecrement = () => {
        if (value > min) {
            onChange(value - 1);
        }
    };

    const handleIncrement = () => {
        if (value < max) {
            onChange(value + 1);
        }
    };

    return (
        <div className={styles.container}>
            <button
                className={styles.button}
                onClick={handleDecrement}
                disabled={value <= min}
                aria-label="Decrease quantity"
            >
                -
            </button>
            <span className={styles.value}>{value}</span>
            <button
                className={styles.button}
                onClick={handleIncrement}
                disabled={value >= max}
                aria-label="Increase quantity"
            >
                +
            </button>
        </div>
    );
}
