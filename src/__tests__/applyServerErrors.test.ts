/**
 * Tests for the shared server-error helper. The behaviour we care about:
 *   1. Field errors are forwarded to RHF's setError when the envelope has
 *      `field_errors`.
 *   2. The toast message lists the failing field names so the user knows
 *      which inputs need attention.
 *   3. Non-validation envelopes (auth, 5xx) trust the backend `message`.
 *   4. Network failures (no response) emit the fallback message.
 *   5. The optional `onFieldError` callback fires once per field for forms
 *      that don't use react-hook-form (e.g. AdminProductForm).
 *   6. `fieldMap` re-keys backend names onto form field names.
 */
import { describe, it, expect, vi } from 'vitest';

import { applyServerErrors, type ToastEmitter } from '@/lib/applyServerErrors';

function makeAxiosError(status: number | undefined, data: unknown) {
    return {
        response: status === undefined ? undefined : { status, data },
    };
}

function makeToast(): ToastEmitter {
    return { error: vi.fn() };
}

describe('applyServerErrors', () => {
    it('forwards field errors to RHF setError', () => {
        const setError = vi.fn();
        const toast = makeToast();
        const error = makeAxiosError(400, {
            message: 'Validation error.',
            type: 'validation_error',
            field_errors: {
                enlace_cta: ['Introduzca una URL válida.'],
                titulo_es: ['Este campo es obligatorio.'],
            },
        });

        const applied = applyServerErrors({
            error,
            setError,
            toast,
            fallbackMessage: 'fallback',
        });

        expect(setError).toHaveBeenCalledTimes(2);
        expect(setError).toHaveBeenCalledWith('enlace_cta', {
            type: 'server',
            message: 'Introduzca una URL válida.',
        });
        expect(setError).toHaveBeenCalledWith('titulo_es', {
            type: 'server',
            message: 'Este campo es obligatorio.',
        });
        expect(applied).toEqual(['enlace_cta', 'titulo_es']);
    });

    it('toast names the failing fields', () => {
        const toast = { error: vi.fn() };
        applyServerErrors({
            error: makeAxiosError(400, {
                message: 'Validation error.',
                type: 'validation_error',
                field_errors: { sku: ['Already exists.'] },
            }),
            setError: vi.fn(),
            toast,
            fallbackMessage: 'fallback',
        });

        expect(toast.error).toHaveBeenCalledTimes(1);
        const [message] = toast.error.mock.calls[0]!;
        expect(message).toContain('Validation error.');
        expect(message).toContain('sku');
    });

    it('uses the envelope message when there are no field errors', () => {
        const toast = { error: vi.fn() };
        applyServerErrors({
            error: makeAxiosError(403, {
                message: 'Permission denied.',
                type: 'permission_denied',
                field_errors: {},
            }),
            setError: vi.fn(),
            toast,
            fallbackMessage: 'fallback',
        });

        const [message] = toast.error.mock.calls[0]!;
        expect(message).toBe('Permission denied.');
    });

    it('falls back when the response is missing entirely (network error)', () => {
        const toast = { error: vi.fn() };
        applyServerErrors({
            error: makeAxiosError(undefined, undefined),
            setError: vi.fn(),
            toast,
            fallbackMessage: 'No conexión',
        });

        const [message] = toast.error.mock.calls[0]!;
        expect(message).toBe('No conexión');
    });

    it('calls onFieldError once per field for non-RHF forms', () => {
        const onFieldError = vi.fn();
        applyServerErrors({
            error: makeAxiosError(400, {
                message: 'Validation error.',
                type: 'validation_error',
                field_errors: {
                    base_price: ['Must be positive.'],
                    sku: ['Already exists.'],
                },
            }),
            toast: makeToast(),
            fallbackMessage: 'fallback',
            onFieldError,
        });

        expect(onFieldError).toHaveBeenCalledTimes(2);
        expect(onFieldError).toHaveBeenCalledWith('base_price', 'Must be positive.');
        expect(onFieldError).toHaveBeenCalledWith('sku', 'Already exists.');
    });

    it('respects fieldMap when backend keys differ from form field names', () => {
        const setError = vi.fn();
        applyServerErrors({
            error: makeAxiosError(400, {
                message: 'Validation error.',
                type: 'validation_error',
                field_errors: { shipping_address: ['Required.'] },
            }),
            setError,
            fieldMap: { shipping_address: 'shippingAddress' },
            toast: makeToast(),
            fallbackMessage: 'fallback',
        });

        expect(setError).toHaveBeenCalledWith('shippingAddress', {
            type: 'server',
            message: 'Required.',
        });
    });

    it('joins multiple messages for a single field with a space', () => {
        const setError = vi.fn();
        applyServerErrors({
            error: makeAxiosError(400, {
                message: 'Validation error.',
                type: 'validation_error',
                field_errors: { sku: ['Required.', 'Already exists.'] },
            }),
            setError,
            toast: makeToast(),
            fallbackMessage: 'fallback',
        });

        expect(setError).toHaveBeenCalledWith('sku', {
            type: 'server',
            message: 'Required. Already exists.',
        });
    });
});
