/**
 * Translate the backend's standardised error envelope into form-level state.
 *
 * Every API error from this backend goes through `core/exceptions.py`'s
 * `envelope_exception_handler` and lands as:
 *
 *     {
 *       "message":       "Validation error.",
 *       "type":          "validation_error" | "permission_denied" | ...,
 *       "field_errors":  { "<field>": ["<msg>", ...] }
 *     }
 *
 * Forms that drop the `onError` callback into a generic `toast.error('...')`
 * throw away the per-field detail and force the user to play "find the
 * broken field". This helper closes that gap by mapping `field_errors`
 * back onto form fields (RHF `setError` or a custom setter) and surfacing
 * a contextual summary toast.
 */
import type { AxiosError } from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Minimal slice of `react-hot-toast` the helper depends on. Typing the
 * option this narrowly (rather than `typeof toast`) keeps the real `toast`
 * object assignable while also accepting lightweight mocks in tests — the
 * full toast type is incompatible with partial objects under
 * `exactOptionalPropertyTypes`.
 */
export interface ToastEmitter {
    error: (message: string, opts?: { duration?: number }) => unknown;
}

interface ErrorEnvelope {
    message?: string;
    type?: string;
    field_errors?: Record<string, string[] | string>;
}

/** Type guard for the envelope shape — defensive against partial deploys
 *  or third-party endpoints that don't share the handler. */
function isEnvelope(value: unknown): value is ErrorEnvelope {
    return typeof value === 'object' && value !== null && (
        'message' in value || 'type' in value || 'field_errors' in value
    );
}

/** Join an error value (`string | string[]`) into a single user-facing message. */
function joinError(errs: string[] | string): string {
    if (Array.isArray(errs)) return errs.filter(Boolean).join(' ');
    return String(errs);
}

interface ApplyServerErrorsOptions<TForm extends FieldValues> {
    /** The axios / TanStack-Query error caught in `onError`. */
    error: unknown;
    /** RHF's `setError`. Pass when the consumer is built on react-hook-form. */
    setError?: UseFormSetError<TForm>;
    /** Backend → form field-name map. Use when the form's field names diverge
     *  from the serializer (e.g. `shipping_address` → `shippingAddress`).
     *  When omitted, backend keys are passed through verbatim — works for
     *  the admin forms whose schemas already use snake_case. */
    fieldMap?: Partial<Record<string, Path<TForm>>>;
    /** Fallback message for non-validation errors / network failures.
     *  Already-translated; the helper does not call i18n itself. */
    fallbackMessage: string;
    /** Toast emitter — usually `react-hot-toast`'s `toast`. Pass to opt
     *  into the contextual summary toast. */
    toast?: ToastEmitter;
    /** Toast duration — defaults to the UX-standards' 8s for errors. */
    toastDuration?: number;
    /** Called once per backend field error AFTER the RHF setError. Use to
     *  surface inline errors in non-RHF forms (e.g. ProductForm holds
     *  field state in plain useState). */
    onFieldError?: (field: string, message: string) => void;
}

/**
 * Returns the list of fields that received an error so callers can, for
 * example, switch to the corresponding tab (e.g. translation tabs in
 * Banner/Popup forms) or auto-scroll to the first failure.
 */
export function applyServerErrors<TForm extends FieldValues>(
    opts: ApplyServerErrorsOptions<TForm>,
): string[] {
    const axiosError = opts.error as AxiosError<unknown>;
    const data = axiosError?.response?.data;
    const status = axiosError?.response?.status;

    // No usable envelope — emit the fallback and stop. Includes the
    // network-error case (`response` undefined) and any non-JSON 5xx.
    if (!isEnvelope(data)) {
        opts.toast?.error(opts.fallbackMessage, { duration: opts.toastDuration ?? 8000 });
        return [];
    }

    const fieldErrors = data.field_errors ?? {};
    const fieldKeys = Object.keys(fieldErrors);

    // Apply field-level errors to the form first so the inline UI updates
    // before the toast appears (visible state should match the toast claim).
    const setError = opts.setError;
    const fieldMap = opts.fieldMap ?? {};
    const appliedFields: string[] = [];

    for (const [backendKey, raw] of Object.entries(fieldErrors)) {
        const message = joinError(raw);
        const formKey = (fieldMap[backendKey] ?? backendKey) as Path<TForm>;
        if (setError) {
            setError(formKey, { type: 'server', message });
        }
        opts.onFieldError?.(formKey as string, message);
        appliedFields.push(formKey as string);
    }

    // Compose the toast. Three branches:
    //   1. We mapped at least one field → list them so the user can find
    //      the failing inputs without scrolling.
    //   2. The envelope has a `message` and no field errors → show it
    //      verbatim (it's already translated by the backend).
    //   3. Anything else → fall back to the caller-provided string.
    if (opts.toast) {
        let toastMessage: string;
        if (appliedFields.length > 0) {
            toastMessage = `${data.message ?? opts.fallbackMessage} (${fieldKeys.join(', ')})`;
        } else if (typeof data.message === 'string' && data.message.length > 0) {
            // Auth-style errors (401/403/throttled) carry the user-facing
            // copy on `message`; trust it.
            toastMessage = data.message;
        } else {
            toastMessage = opts.fallbackMessage;
        }

        // Some statuses warrant a longer toast — 401 is rare but loud,
        // 5xx is "something broke", others are user-correctable.
        const duration = opts.toastDuration ?? (status && status >= 500 ? 8000 : 6000);
        opts.toast.error(toastMessage, { duration });
    }

    return appliedFields;
}
