import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CountdownTimer } from '../components/ui/CountdownTimer/CountdownTimer';

describe('CountdownTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders timer with future date', () => {
        const future = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString();
        const { container } = render(<CountdownTimer targetDate={future} />);
        expect(container.firstChild).toBeTruthy();
    });

    it('shows expired state for past date after tick', () => {
        const past = new Date(Date.now() - 1000).toISOString();
        render(<CountdownTimer targetDate={past} />);
        act(() => {
            vi.advanceTimersByTime(1100);
        });
        // Without i18n init, `t('expired')` echoes the key.
        expect(screen.getByText('expired')).toBeTruthy();
    });

    it('calls onExpire when timer ticks past zero', () => {
        const onExpire = vi.fn();
        const past = new Date(Date.now() - 1000).toISOString();
        render(<CountdownTimer targetDate={past} onExpire={onExpire} />);
        act(() => {
            vi.advanceTimersByTime(1100);
        });
        expect(onExpire).toHaveBeenCalled();
    });
});
