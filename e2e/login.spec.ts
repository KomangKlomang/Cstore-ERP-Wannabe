import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
  test("shows login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "nobody@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Email atau password salah")).toBeVisible();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rina@cstore.id");
    await page.fill('input[type="password"]', "mms2026");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });
});
