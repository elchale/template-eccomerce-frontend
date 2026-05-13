import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Skeleton } from '../components/ui/Skeleton/Skeleton';

describe('Skeleton', () => {
    it('renders with default variant', () => {
        const { container } = render(<Skeleton />);
        const el = container.firstChild as HTMLElement;
        expect(el).toBeTruthy();
        expect(el.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders card variant', () => {
        const { container } = render(<Skeleton variant="card" />);
        const el = container.firstChild as HTMLElement;
        expect(el.className).toContain('card');
    });

    it('applies width and height', () => {
        const { container } = render(<Skeleton width={200} height={50} />);
        const el = container.firstChild as HTMLElement;
        expect(el.style.width).toBe('200px');
        expect(el.style.height).toBe('50px');
    });
});
