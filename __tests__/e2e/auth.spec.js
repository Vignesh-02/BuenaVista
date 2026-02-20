// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Auth flows", () => {
    test("register page shows Create Account form", async ({ page }) => {
        await page.goto("/register", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /Create Account/i })).toBeVisible({
            timeout: 10000,
        });
        await expect(page.getByLabel(/Username/i)).toBeVisible();
        await expect(page.getByLabel(/Email/i)).toBeVisible();
        await expect(page.getByLabel(/Password/i)).toBeVisible();
        await expect(page.getByRole("button", { name: /Create Account/i })).toBeVisible();
    });

    test("new user can register and is redirected to locations", async ({ page }) => {
        const username = `e2euser_${Date.now()}`;
        const email = `${username}@example.com`;
        const password = "SecurePass123";

        await page.goto("/register", { waitUntil: "domcontentloaded" });
        await page.getByLabel(/Username/i).fill(username);
        await page.getByLabel(/Email/i).fill(email);
        await page.getByLabel(/Password/i).fill(password);
        await page.getByRole("button", { name: /Create Account/i }).click();

        await expect(page).toHaveURL(/\/locations/);
        await expect(page.getByText(new RegExp(`Welcome.*${username}`, "i"))).toBeVisible({
            timeout: 10000,
        });
    });

    test("login page shows Welcome Back and Sign In form", async ({ page }) => {
        await page.goto("/login", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible({
            timeout: 10000,
        });
        await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
    });

    test("registered user can log in and see locations", async ({ page }) => {
        const username = `loginuser_${Date.now()}`;
        const email = `${username}@example.com`;
        const password = "SecurePass123";

        await page.goto("/register", { waitUntil: "domcontentloaded" });
        await page.getByLabel(/Username/i).fill(username);
        await page.getByLabel(/Email/i).fill(email);
        await page.getByLabel(/Password/i).fill(password);
        await page.getByRole("button", { name: /Create Account/i }).click();
        await expect(page).toHaveURL(/\/locations/);

        await page.goto("/logout");
        await expect(page).toHaveURL(/\/locations/);

        await page.goto("/login", { waitUntil: "domcontentloaded" });
        await page.getByLabel(/Username/i).fill(username);
        await page.getByLabel(/Password/i).fill(password);
        await page.getByRole("button", { name: /Sign In/i }).click();

        await expect(page).toHaveURL(/\/locations/);
        await expect(page.getByText(new RegExp(`Welcome back.*${username}`, "i"))).toBeVisible({
            timeout: 10000,
        });
    });

    test("invalid login shows error and stays on login", async ({ page }) => {
        await page.goto("/login", { waitUntil: "domcontentloaded" });
        await page.getByLabel(/Username/i).fill("nonexistentuser");
        await page.getByLabel(/Password/i).fill("wrongpass");
        await page.getByRole("button", { name: /Sign In/i }).click();

        // Still on login page
        await expect(page).toHaveURL(/\/login/);

        // Error toast should be visible (don't depend on exact message text)
        const errorToastBody = page.locator(".toast-error .toast-body");
        await expect(errorToastBody).toBeVisible({ timeout: 10000 });
    });
});
