'use strict';

const globals = require('globals');

module.exports = [
    {
        files: ['*.user.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                waitForKeyElements: 'readonly',
                GM_addStyle: 'readonly',
                module: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-undef': 'error',
        },
    },
    {
        files: ['test/**/*.js', 'scripts/**/*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
            },
        },
    },
];
