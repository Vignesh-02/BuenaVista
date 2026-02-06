// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const PORT = process.env.PORT || 5007;
const baseURL = `http://localhost:${PORT}`;

module.exports = defineConfig({
    testDir: "./__tests__/e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "node scripts/start-e2e-server.js",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120000,
        env: { PORT: String(PORT) },
    },
});
