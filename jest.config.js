/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: "node",
    testMatch: ["**/__tests__/**/*.test.js"],
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
    collectCoverageFrom: [
        "controllers/**/*.js",
        "lib/**/*.js",
        "utils/**/*.js",
        "routes/**/*.js",
        "middleware/**/*.js",
        "models/**/*.js",
        "app.js",
        "db.js",
        "!**/node_modules/**",
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov"],
    testTimeout: 30000,
    verbose: true,
};
