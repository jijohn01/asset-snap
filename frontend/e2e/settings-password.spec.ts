import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
}

test.describe("비밀번호 변경", () => {
  test("이메일 가입 사용자에게 계정 보안 섹션이 표시된다", async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip();
    await login(page);
    await page.goto("/settings");
    await expect(page.locator("text=계정 보안")).toBeVisible();
    await expect(page.getByPlaceholder("현재 비밀번호")).toBeVisible();
    await expect(page.getByPlaceholder("8자 이상")).toBeVisible();
    await expect(page.getByPlaceholder("새 비밀번호 재입력")).toBeVisible();
  });

  test("새 비밀번호가 8자 미만이면 에러 메시지를 표시한다", async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip();
    await login(page);
    await page.goto("/settings");
    await page.fill('input[placeholder="현재 비밀번호"]', "anypassword");
    await page.fill('input[placeholder="8자 이상"]', "short");
    await page.fill('input[placeholder="새 비밀번호 재입력"]', "short");
    await page.click('button:has-text("변경")');
    await expect(page.locator("text=비밀번호는 8자 이상이어야 합니다")).toBeVisible();
  });

  test("새 비밀번호와 확인이 다르면 에러 메시지를 표시한다", async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip();
    await login(page);
    await page.goto("/settings");
    await page.fill('input[placeholder="현재 비밀번호"]', "anypassword");
    await page.fill('input[placeholder="8자 이상"]', "newpassword123");
    await page.fill('input[placeholder="새 비밀번호 재입력"]', "differentpassword");
    await page.click('button:has-text("변경")');
    await expect(page.locator("text=비밀번호가 일치하지 않습니다")).toBeVisible();
  });

  test("현재 비밀번호가 틀리면 에러 메시지를 표시한다", async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip();
    await login(page);
    await page.goto("/settings");
    await page.fill('input[placeholder="현재 비밀번호"]', "definitelywrongpassword999");
    await page.fill('input[placeholder="8자 이상"]', "newpassword123");
    await page.fill('input[placeholder="새 비밀번호 재입력"]', "newpassword123");
    await page.click('button:has-text("변경")');
    await expect(page.locator("text=현재 비밀번호가 올바르지 않습니다")).toBeVisible({ timeout: 8000 });
  });
});
