// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Navigation", () => {
    test("locations page loads", async ({ page }) => {
        await page.goto("/locations", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/\/locations/);
        await expect(page.locator("body")).toContainText(/locations|Locations|Explore/i, {
            timeout: 10000,
        });
    });

    test("locations/new redirects to login when not authenticated", async ({ page }) => {
        await page.context().clearCookies();
        await page.goto("/locations/new", { waitUntil: "networkidle" });
        await expect(page).toHaveURL(/\/login/);
    });

    test("register link from landing goes to register", async ({ page }) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page
            .locator("#landingNav")
            .getByRole("link", { name: /Sign Up/i })
            .click();
        await expect(page).toHaveURL(/\/register/);
    });

    test("login link from landing goes to login", async ({ page }) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.locator("#landingNav").getByRole("link", { name: /Login/i }).click();
        await expect(page).toHaveURL(/\/login/);
    });
});
