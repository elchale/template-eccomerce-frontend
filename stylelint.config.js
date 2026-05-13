/**
 * Stylelint configuration for CSS Modules.
 *
 * Layers:
 *  - `stylelint-config-standard` — community baseline (errors on real bugs).
 *  - `stylelint-config-css-modules` — relaxes selector rules that fight `:global`, `:local`, composes.
 *  - `stylelint-config-recess-order` — alphabet-free, semantic property order
 *    (positioning → box-model → typography → visual → misc).
 */
export default {
    extends: [
        'stylelint-config-standard',
        'stylelint-config-css-modules',
        'stylelint-config-recess-order',
    ],
    ignoreFiles: [
        'dist/**',
        'node_modules/**',
        'coverage/**',
        'playwright-report/**',
        '**/*.min.css',
        'public/**',
    ],
    rules: {
        // Accept both camelCase (CSS Modules → JS-friendly) and kebab-case (global utility / theme classes).
        'selector-class-pattern': [
            '^[a-zA-Z][a-zA-Z0-9_-]*$',
            {
                message:
                    'Class names should be alphanumeric (camelCase, PascalCase, or kebab-case).',
            },
        ],
        // Accept either camelCase or kebab-case keyframe names — both are common.
        'keyframes-name-pattern': '^[a-zA-Z][a-zA-Z0-9-]*$',
        // CSS custom property naming — three-tier system in styles/variables.css.
        'custom-property-pattern': [
            '^(--)?[a-z][a-z0-9-]*$',
            { message: 'Custom properties should be kebab-case.' },
        ],
        'value-keyword-case': ['lower', { ignoreProperties: ['/font-family/'] }],
        'declaration-empty-line-before': null,
        'function-no-unknown': [true, { ignoreFunctions: ['theme'] }],
        'no-descending-specificity': null,
        'declaration-block-no-redundant-longhand-properties': null,
        'no-duplicate-selectors': null,
        // `clip` is deprecated, but it remains the only way to support the canonical
        // screen-reader-only visually-hidden pattern in some legacy browsers.
        'property-no-deprecated': null,
        // Fallback property duplications (e.g. `background: red; background: oklch(...)`) are intentional.
        'declaration-block-no-duplicate-properties': [
            true,
            { ignore: ['consecutive-duplicates-with-different-values'] },
        ],
        // Vendor-prefix patterns we keep for cross-engine support.
        'shorthand-property-no-redundant-values': null,
        // Native nesting is in widespread support and Vite/PostCSS handle it.
        'declaration-property-value-no-unknown': null,
        // `word-break: break-word` is deprecated but identical to `overflow-wrap: anywhere`
        // in every shipping browser. Keep the legacy keyword for tooling compatibility.
        'declaration-property-value-keyword-no-deprecated': null,
    },
};
