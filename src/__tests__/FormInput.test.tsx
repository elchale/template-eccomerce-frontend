/**
 * Tests for FormInput's error i18n.
 *
 * The bug: FormInput used to pass the RAW zod `message` to <Input>, which renders
 * it below the field. Because zod messages are i18n KEYS, users saw the literal
 * key (e.g. "checkout_email_invalid").
 *
 * The fix: zod messages are now namespace-qualified keys (`shop:...`, `admin:...`)
 * and FormInput resolves them through i18next's namespace-agnostic `t`. This
 * verifies:
 *  - a `shop:`-qualified key renders as the translated string,
 *  - an `admin:`-qualified key renders as the translated string,
 *  - the error is shown exactly ONCE (no label + below duplication),
 *  - a plain (non-key) server message passes through verbatim,
 *  - switching language re-resolves the message.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { useForm } from 'react-hook-form';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { FormInput } from '@/components/forms/FormField/FormInput';

// A minimal i18next instance with the two namespaces the forms use. Mirrors the
// real `shop` / `admin` JSON keys exercised by the schemas.
const testI18n = i18n.createInstance();

beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
        lng: 'es',
        fallbackLng: 'es',
        defaultNS: 'common',
        ns: ['common', 'shop', 'admin'],
        interpolation: { escapeValue: false },
        resources: {
            es: {
                shop: { checkout_email_invalid: 'Correo electrónico inválido' },
                admin: { banner_form_required: 'Nombre y título son requeridos' },
            },
            en: {
                shop: { checkout_email_invalid: 'Invalid email address' },
                admin: { banner_form_required: 'Name and title are required' },
            },
        },
    });
});

// ── Shop-namespaced schema (mirrors checkoutSchema's email rule) ──────────────
const shopSchema = z.object({
    email: z.string().email({ message: 'shop:checkout_email_invalid' }),
});
type ShopValues = z.infer<typeof shopSchema>;

function ShopForm() {
    const { control, handleSubmit } = useForm<ShopValues>({
        resolver: zodResolver(shopSchema),
        defaultValues: { email: 'not-an-email' },
    });
    return (
        <form onSubmit={handleSubmit(() => {})}>
            <FormInput control={control} name="email" label="Email" isRequired />
            <button type="submit">submit</button>
        </form>
    );
}

// ── Admin-namespaced schema (mirrors bannerSchema's nombre min-length rule).
// A non-empty-but-invalid default is used so the field carries a value RHF will
// validate on submit (matching the storefront's onSubmit validation mode). ──
const adminSchema = z.object({
    nombre: z.string().min(3, { message: 'admin:banner_form_required' }),
});
type AdminValues = z.infer<typeof adminSchema>;

function AdminForm() {
    const { control, handleSubmit } = useForm<AdminValues>({
        resolver: zodResolver(adminSchema),
        defaultValues: { nombre: 'ab' },
    });
    return (
        <form onSubmit={handleSubmit(() => {})}>
            <FormInput control={control} name="nombre" label="Nombre" isRequired />
            <button type="submit">submit</button>
        </form>
    );
}

// ── Server-error schema: a plain (already-translated) string is set manually ──
const plainSchema = z.object({ field: z.string() });
type PlainValues = z.infer<typeof plainSchema>;

function ServerErrorForm() {
    const { control, setError } = useForm<PlainValues>({
        resolver: zodResolver(plainSchema),
        defaultValues: { field: '' },
    });
    return (
        <form>
            <FormInput control={control} name="field" label="Field" />
            <button
                type="button"
                onClick={() =>
                    setError('field', { type: 'server', message: 'Este campo ya existe.' })
                }
            >
                trigger-server-error
            </button>
        </form>
    );
}

function renderWithI18n(ui: React.ReactElement) {
    return render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
}

describe('FormInput error i18n', () => {
    it('resolves a shop:-qualified zod key to the translated string, shown once', async () => {
        const user = userEvent.setup();
        renderWithI18n(<ShopForm />);
        await user.click(screen.getByText('submit'));

        const matches = await screen.findAllByText('Correo electrónico inválido');
        // Exactly once — no label + below duplication, and no raw key leak.
        expect(matches).toHaveLength(1);
        expect(screen.queryByText('shop:checkout_email_invalid')).toBeNull();
        expect(screen.queryByText('checkout_email_invalid')).toBeNull();
    });

    it('resolves an admin:-qualified zod key to the translated string', async () => {
        const user = userEvent.setup();
        renderWithI18n(<AdminForm />);
        await user.click(screen.getByText('submit'));

        expect(await screen.findByText('Nombre y título son requeridos')).toBeTruthy();
        expect(screen.queryByText('admin:banner_form_required')).toBeNull();
    });

    it('passes a plain (non-key) server message through verbatim', async () => {
        const user = userEvent.setup();
        renderWithI18n(<ServerErrorForm />);
        await user.click(screen.getByText('trigger-server-error'));

        expect(await screen.findByText('Este campo ya existe.')).toBeTruthy();
    });

    it('re-resolves the message after a language change', async () => {
        const user = userEvent.setup();
        renderWithI18n(<ShopForm />);
        await user.click(screen.getByText('submit'));
        await screen.findByText('Correo electrónico inválido');

        await testI18n.changeLanguage('en');
        await waitFor(() =>
            expect(screen.getByText('Invalid email address')).toBeTruthy(),
        );

        // Restore for other tests.
        await testI18n.changeLanguage('es');
    });
});
