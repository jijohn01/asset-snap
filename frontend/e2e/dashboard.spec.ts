import { test, expect } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

test.describe("대시보드", () => {
  test.beforeEach(async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.goto("/login");
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 8000 });
  });

  test("대시보드 핵심 요소 렌더링", async ({ page }) => {
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.getByText("순자산", { exact: true })).toBeVisible();
  });

  test("사이드바 네비게이션 링크 노출", async ({ page }) => {
    await expect(page.getByRole("link", { name: /월별 이력/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /설정/i })).toBeVisible();
  });
});
