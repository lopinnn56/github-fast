import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['dist/**', 'node_modules/**']
    },
    js.configs.recommended,
    {
        files: ['js/**/*.js', 'scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            eqeqeq: ['error', 'smart'],
            'prefer-const': 'error'
        }
    }
];
