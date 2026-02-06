// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Landing page", () => {
    test("loads and shows BuenaVista branding", async ({ page }) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveTitle(/BuenaVista/i, { timeout: 10000 });
        await expect(page.getByRole("link", { name: /BuenaVista/i }).first()).toBeVisible({ timeout: 10000 });
    });

    test("hero has Explore and Join links", async ({ page }) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("link", { name: /Explore Locations/i })).toBeVisible({ timeout: 10000 });
        await expect(page.getByRole("link", { name: /Join Free/i })).toBeVisible();
    });

    test("navbar has Login and Sign Up when not logged in", async ({ page }) => {
        await page.goto("/", { waitUntil: "load" });
        const loginNavLink = page.locator("#landingNav").getByRole("link", { name: /Login/i });
        const signUpNavLink = page.locator("#landingNav").getByRole("link", { name: /Sign Up/i });

        // Assert the navbar contains exactly one Login and one Sign Up link
        await expect(loginNavLink).toHaveCount(1);
        await expect(signUpNavLink).toHaveCount(1);
    });

    test("Explore Locations navigates to /locations", async ({ page }) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.getByRole("link", { name: /Explore Locations/i }).click();
        await expect(page).toHaveURL(/\/locations/);
    });
});
