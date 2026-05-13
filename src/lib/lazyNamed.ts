import { lazy, type ComponentType } from 'react';

/**
 * Wraps `React.lazy` to work with named exports (the codebase convention).
 * `lazy()` itself requires a module with a `default` export — `lazyNamed`
 * adapts a named export so we don't have to add `default` exports just for
 * code-splitting.
 *
 * @example
 * const AdminAnalytics = lazyNamed(
 *   () => import('@/pages/admin/AdminAnalytics/AdminAnalytics'),
 *   'AdminAnalytics',
 * );
 */
export function lazyNamed<K extends string, M extends Record<K, ComponentType<unknown>>>(
    factory: () => Promise<M>,
    name: K,
) {
    return lazy(() => factory().then((m) => ({ default: m[name] })));
}
