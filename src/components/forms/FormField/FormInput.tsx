import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

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
    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
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
                    errorMessage={fieldState.error?.message}
                />
            )}
        />
    );
}
