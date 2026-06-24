import { test, expect } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

test.describe("인증", () => {
  test("미로그인 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("잘못된 비밀번호로 로그인 실패 시 에러 표시", async ({ page }) => {
    if (!EMAIL) test.skip();
    await page.goto("/login");
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', "wrong-password-123");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=이메일 또는 비밀번호가 올바르지 않습니다")).toBeVisible({ timeout: 5000 });
  });

  test("올바른 자격증명으로 로그인 후 대시보드 이동", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.goto("/login");
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 8000 });
  });
});
