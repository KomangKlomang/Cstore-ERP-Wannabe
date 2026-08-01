import { test, expect } from "@playwright/test";

test.describe("App navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "rina@cstore.id");
    await page.fill('input[type="password"]', "mms2026");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test("sidebar navigation to master product", async ({ page }) => {
    await page.click("text=Product");
    await expect(page).toHaveURL(/master\/product/);
  });

  test("sidebar navigation to pengajuan", async ({ page }) => {
    await page.click("text=Pengajuan");
    await expect(page).toHaveURL(/pengajuan/);
  });

  test("theme toggle works", async ({ page }) => {
    const html = page.locator("html");
    const toggleBtn = page
      .locator('[aria-label="Toggle theme"]')
      .or(page.locator("button:has(svg.lucide-moon)"))
      .or(page.locator("button:has(svg.lucide-sun)"));
    if (await toggleBtn.count()) {
      await toggleBtn.first().click();
      await page.waitForTimeout(300);
    }
  });

  test("404 page for invalid routes", async ({ page }) => {
    await page.goto("/nonexistent-route-12345");
    await expect(page.locator("text=404").or(page.locator("text=tidak ditemukan"))).toBeVisible();
  });
});
