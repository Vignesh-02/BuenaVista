/* eslint-env node */
module.exports = {
    root: true,
    env: {
        node: true,
        es2021: true,
        jest: true,
    },
    extends: ["eslint:recommended", "prettier"],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: "script",
    },
    ignorePatterns: [
        "node_modules/",
        "coverage/",
        "test-results/",
        "playwright-report/",
        "playwright/.cache/",
        "*.min.js",
        "public/",
    ],
    rules: {
        "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
};
