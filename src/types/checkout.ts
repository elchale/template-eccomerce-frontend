import { z } from 'zod';

/**
 * Checkout form schema. Validation messages are namespace-qualified i18n keys
 * (`shop:<key>`); `FormInput` resolves them via i18next's namespace-agnostic `t`
 * at error-render time. Server-side validation errors come back as
 * already-translated strings and are surfaced via RHF's `setError(field, { type: 'server' })`
 * — they are not i18n keys, so i18next returns them verbatim.
 */
export const checkoutSchema = z
    .object({
        email: z.string().email({ message: 'shop:checkout_email_invalid' }),
        phone: z.string().optional().or(z.literal('')),
        shippingAddress: z.string().min(1, { message: 'shop:checkout_shipping_required' }),
        sameAsShipping: z.boolean(),
        billingAddress: z.string().optional().or(z.literal('')),
        notes: z.string().optional().or(z.literal('')),
    })
    .refine(
        (data) =>
            data.sameAsShipping || (data.billingAddress && data.billingAddress.trim().length > 0),
        { message: 'shop:checkout_billing_required', path: ['billingAddress'] },
    );

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/**
 * Maps backend field names (DRF serializer keys) → CheckoutFormValues keys.
 * Used to project 400-response field errors back onto RHF fields.
 */
export const BACKEND_CHECKOUT_FIELD_MAP = {
    shipping_address: 'shippingAddress',
    billing_address: 'billingAddress',
    email: 'email',
    phone: 'phone',
    notes: 'notes',
} as const satisfies Record<string, keyof CheckoutFormValues>;
