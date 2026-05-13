import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ProgressBar } from '../components/ui/ProgressBar/ProgressBar';

describe('ProgressBar', () => {
    it('renders with label', () => {
        render(<ProgressBar value={30} max={100} label="Progreso" />);
        expect(screen.getByText('Progreso')).toBeTruthy();
    });

    it('sets aria attributes', () => {
        const { container } = render(<ProgressBar value={50} max={100} />);
        const bar = container.querySelector('[role="progressbar"]');
        expect(bar).toBeTruthy();
        expect(bar?.getAttribute('aria-valuenow')).toBe('50');
        expect(bar?.getAttribute('aria-valuemax')).toBe('100');
    });

    it('clamps value to 100%', () => {
        const { container } = render(<ProgressBar value={200} max={100} />);
        const fill = container.querySelector('[style*="width: 100%"]');
        expect(fill).toBeTruthy();
    });
});
