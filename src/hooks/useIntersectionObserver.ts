import { useEffect, useState, type RefObject } from 'react';

/**
 * Observes the element pointed at by {@link ref} and returns whether it is
 * currently intersecting the viewport (or the provided root).
 *
 * Use for: sticky-CTA visibility ("show after main CTA scrolls out of view"),
 * lazy-load triggers, scroll-spy navigation.
 */
export function useIntersectionObserver(
    ref: RefObject<Element | null>,
    options?: IntersectionObserverInit,
): boolean {
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry) setIsIntersecting(entry.isIntersecting);
        }, options);

        observer.observe(node);
        return () => observer.disconnect();
    }, [ref, options]);

    return isIntersecting;
}
