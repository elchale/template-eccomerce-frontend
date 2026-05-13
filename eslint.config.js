/**
 * Flat ESLint configuration. The pipeline is layered:
 *  1. ECMAScript + TypeScript correctness (type-checked rules).
 *  2. React / Hooks / JSX runtime / refresh / a11y.
 *  3. Import hygiene with the `@/` alias enforced.
 *  4. Code-quality plugins: unicorn (modern JS), promise, sonarjs (complexity).
 *  5. Prettier-compatibility — must remain last to disable stylistic conflicts.
 *
 * Test files get a dedicated override that loads testing-library + vitest
 * rules and relaxes type-checked strictness that is noise in tests.
 */
import js from '@eslint/js';
import vitestPlugin from '@vitest/eslint-plugin';
import { globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import promisePlugin from 'eslint-plugin-promise';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import testingLibrary from 'eslint-plugin-testing-library';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config([
    globalIgnores([
        'dist',
        'node_modules',
        '.claude',
        'coverage',
        'playwright-report',
        'test-results',
        '**/*.d.ts',
    ]),

    // ============================================================
    // Base rules — TS/TSX source under src/ and vite config
    // ============================================================
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
            reactPlugin.configs.flat.recommended,
            reactPlugin.configs.flat['jsx-runtime'],
            jsxA11y.flatConfigs.recommended,
            reactHooks.configs['recommended-latest'],
            reactRefresh.configs.vite,
            importPlugin.flatConfigs.recommended,
            importPlugin.flatConfigs.typescript,
            unicornPlugin.configs['flat/recommended'],
            promisePlugin.configs['flat/recommended'],
            sonarjsPlugin.configs.recommended,
            prettier, // MUST be last — disables stylistic rules that conflict with Prettier
        ],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        settings: {
            react: { version: 'detect' },
            'import/resolver': {
                typescript: { project: './tsconfig.app.json' },
                node: true,
            },
        },
        rules: {
            // -------- TypeScript --------
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            // Async event handlers (onClick, onSubmit, …) commonly return Promises by design.
            '@typescript-eslint/no-misused-promises': [
                'error',
                { checksVoidReturn: { attributes: false } },
            ],
            '@typescript-eslint/restrict-template-expressions': [
                'error',
                { allowNumber: true, allowBoolean: true, allowNullish: true, allowAny: false },
            ],
            // Real bug signal but pervasive in fire-and-forget mutate() / refetch() patterns —
            // surface as warnings so the next refactor pass can address them with `void` or `.catch()`.
            '@typescript-eslint/no-floating-promises': 'warn',
            // Auto-fixable but unsafe to auto-rewrite when both sides could be strings.
            '@typescript-eslint/prefer-nullish-coalescing': 'warn',
            // `any` propagation from 3rd-party libs (jwt-decode, react-datepicker) is hard to
            // narrow without ambient typings — track as warnings, escalate after typings PR.
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',
            // Empty body is intentional in default handler stubs / no-op observers.
            '@typescript-eslint/no-empty-function': [
                'error',
                { allow: ['arrowFunctions', 'methods', 'private-constructors'] },
            ],
            // Confidently-typed Record/Array index access — handled by tsconfig noUncheckedIndexedAccess.
            '@typescript-eslint/no-non-null-assertion': 'warn',

            // -------- Imports --------
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    pathGroups: [{ pattern: '@/**', group: 'internal' }],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
            'import/no-duplicates': 'error',
            // Axios interceptor ↔ auth-store coupling is intentional and only resolved
            // at runtime call sites (no top-level access). Re-enable per-file if needed.
            'import/no-cycle': 'off',
            'import/no-useless-path-segments': 'error',
            'import/no-self-import': 'error',
            'import/no-unresolved': 'off', // TS handles this; ESM resolver false-positives on @/ subpaths
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['../../*'],
                            message: 'Use the @/ path alias instead of deep relative imports.',
                        },
                    ],
                },
            ],

            // -------- React --------
            // Accept either ternary or coercion (`!!cond && <X />`) — both are safe.
            'react/jsx-no-leaked-render': ['error', { validStrategies: ['coerce', 'ternary'] }],
            'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
            'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],
            'react/self-closing-comp': 'error',
            'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
            'react/jsx-boolean-value': ['error', 'never'],
            'react/prop-types': 'off', // TypeScript supersedes
            'react/display-name': 'off',
            'react-hooks/exhaustive-deps': 'error',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

            // -------- Unicorn (curated — drop the opinionated noise) --------
            'unicorn/filename-case': 'off', // PascalCase folders / camelCase files mixed by design
            'unicorn/no-null': 'off',
            'unicorn/prevent-abbreviations': 'off',
            'unicorn/no-array-callback-reference': 'off',
            'unicorn/no-array-for-each': 'off',
            'unicorn/no-array-reduce': 'off',
            'unicorn/no-useless-undefined': 'off', // conflicts with exactOptionalPropertyTypes
            'unicorn/prefer-module': 'off',
            'unicorn/numeric-separators-style': 'off',
            'unicorn/switch-case-braces': 'off',
            'unicorn/prefer-export-from': 'off',
            'unicorn/no-nested-ternary': 'off',
            'unicorn/no-negated-condition': 'off',
            'unicorn/prefer-top-level-await': 'off',
            'unicorn/prefer-global-this': 'off',
            'unicorn/consistent-function-scoping': ['warn', { checkArrowFunctions: false }],
            'unicorn/explicit-length-check': 'off',
            // DOM API stylistic preferences — not bug catchers, just style. Disable.
            'unicorn/prefer-query-selector': 'off',
            'unicorn/prefer-dom-node-append': 'off',
            'unicorn/prefer-dom-node-dataset': 'off',
            'unicorn/prefer-dom-node-remove': 'off',
            'unicorn/prefer-add-event-listener': 'off',
            // Allow `Boolean()` (used as React JSX render guard with jsx-no-leaked-render)
            'unicorn/no-array-callback-reference': 'off',
            'unicorn/prefer-spread': 'off', // [...arr] vs Array.from() — both legitimate
            'unicorn/no-useless-spread': 'warn',
            // `Array#toSorted` and `NodeList.at()` need ES2023 + DOM lib upgrades;
            // we target ES2022 + DOM.Iterable so disable rather than churn build settings.
            'unicorn/no-array-sort': 'off',
            'unicorn/prefer-at': 'off',

            // -------- SonarJS (calibrated for application code) --------
            'sonarjs/cognitive-complexity': ['warn', 25],
            'sonarjs/no-duplicate-string': 'off',
            'sonarjs/no-nested-template-literals': 'off',
            'sonarjs/no-small-switch': 'off',
            'sonarjs/no-identical-functions': ['warn', 5],
            // Sonar's deprecation detector chokes on Phosphor icons named with JSDoc
            // pointers (e.g. ArrowLeft) that the library does not mark deprecated.
            'sonarjs/deprecation': 'off',
            // Nested ternaries are sometimes the cleanest expression of a 3-way render.
            'sonarjs/no-nested-conditional': 'off',
            // `type Foo = Bar` is a legitimate alias for narrowing/branding.
            'sonarjs/redundant-type-aliases': 'off',
            // `function Component(){}` works fine and is more readable for small components.
            'sonarjs/function-return-type': 'off',
            // Hidden-content / decorative-only divs are intentional design choices.
            'sonarjs/no-unused-vars': 'off', // overlaps with TS rule
            // `Readonly<Props>` is a stylistic React convention — useful but enforcement is noise.
            'sonarjs/prefer-read-only-props': 'off',
            // Other stylistic Sonar rules that don't catch real bugs.
            'sonarjs/no-selector-parameter': 'off',
            'sonarjs/no-alphabetical-sort': 'off',
            'sonarjs/concise-regex': 'off',
            // All slow-regex hits in this codebase are linear-time client-side validators
            // (email format, HTML-tag strip) on length-bounded inputs. The rule is too
            // conservative; real ReDoS risks come from server-side regex on user data.
            'sonarjs/slow-regex': 'off',

            // -------- Promise --------
            'promise/always-return': 'off',
            'promise/catch-or-return': 'off',
            'promise/no-nesting': 'warn',

            // -------- Generic JS hygiene --------
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-var': 'error',
            'prefer-const': 'error',
            'object-shorthand': 'error',
        },
    },

    // ============================================================
    // Test files — relax type-checked + add testing-library / vitest
    // ============================================================
    {
        files: ['src/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', 'src/test-setup.ts'],
        extends: [testingLibrary.configs['flat/react'], vitestPlugin.configs.recommended],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            'sonarjs/cognitive-complexity': 'off',
            'sonarjs/no-identical-functions': 'off',
            'sonarjs/slow-regex': 'off',
            'unicorn/consistent-function-scoping': 'off',
            'no-console': 'off',
            // Testing Library — tests legitimately need DOM/container access during legacy migrations.
            // Surface as warnings so they're visible but don't block CI.
            'testing-library/no-node-access': 'warn',
            'testing-library/no-container': 'warn',
            'testing-library/prefer-find-by': 'warn',
        },
    },

    // ============================================================
    // Vite / Playwright config — relax browser-only assumptions
    // ============================================================
    {
        files: ['vite.config.ts', 'playwright.config.ts'],
        languageOptions: { globals: { ...globals.node } },
        rules: {
            'import/no-default-export': 'off',
        },
    },

    // ============================================================
    // E2E specs — Playwright fixtures, browser globals, looser rules.
    // Playwright's API is idiomatically async, uses .innerText and inline
    // import() types in route handlers, and frequently chains assertions
    // without explicit awaits — none of which are real bug signals in
    // E2E context.
    // ============================================================
    {
        files: ['e2e/**/*.{ts,tsx}'],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/prefer-nullish-coalescing': 'off',
            '@typescript-eslint/consistent-type-imports': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            'unicorn/prefer-dom-node-text-content': 'off',
            'sonarjs/cognitive-complexity': 'off',
            'sonarjs/no-identical-functions': 'off',
            'no-console': 'off',
        },
    },

    // ============================================================
    // Logger — the one place where `console.*` is intentional.
    // ============================================================
    {
        files: ['src/lib/logger.ts'],
        rules: {
            'no-console': 'off',
        },
    },
]);
