import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/forms';

/**
 * Adapter that connects {@link Input} (which uses `value`/`setValue` props) to a
 * react-hook-form `Controller`. Use this from form components that adopt RHF.
 *
 * @example
 *   const { control } = useForm<MyShape>();
 *   <FormInput control={control} name="email" label="Email" />
 *
 * Errors come from `formState.errors` automatically — no need to thread `errorMessage`.
 *
 * Error i18n: zod schemas set the error `message` to a namespace-qualified i18n
 * key (e.g. `shop:checkout_email_invalid`, `admin:banner_form_required`). This
 * adapter resolves it through i18next's namespace-agnostic `t`, which honours the
 * `ns:key` prefix. A message that is NOT a known key (e.g. an already-translated
 * server error from `setError(field, { type: 'server' })`) is returned verbatim,
 * so plain human strings pass through unchanged.
 */
interface FormInputProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label?: string;
    placeholder?: string;
    type?: 'text' | 'email' | 'url' | 'password' | 'tel' | 'search' | 'number';
    multiline?: boolean;
    rows?: number;
    isRequired?: boolean;
    isDisabled?: boolean;
    variant?: 'flat' | 'bordered' | 'faded' | 'underlined';
}

export function FormInput<T extends FieldValues>({
    control,
    name,
    label,
    placeholder,
    type = 'text',
    multiline,
    rows,
    isRequired,
    isDisabled,
    variant = 'bordered',
}: FormInputProps<T>) {
    const { t } = useTranslation();
    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => {
                const rawMessage = fieldState.error?.message;
                // Resolve namespace-qualified zod keys (`ns:key`) to the active
                // language. i18next returns the input unchanged when it isn't a
                // known key, so already-translated server messages pass through.
                const errorMessage = rawMessage ? t(rawMessage) : undefined;
                return (
                    <Input
                        name={name}
                        value={(field.value as string) ?? ''}
                        setValue={field.onChange}
                        label={label}
                        placeholder={placeholder}
                        type={type}
                        multiline={multiline}
                        rows={rows}
                        isRequired={isRequired}
                        isDisabled={isDisabled}
                        variant={variant}
                        errorMessage={errorMessage}
                    />
                );
            }}
        />
    );
}
