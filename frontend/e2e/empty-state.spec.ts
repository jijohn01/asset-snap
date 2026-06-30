import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

const EMPTY_GROUPS: never[] = [];

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
}

test.describe("빈 장부 상태 — 대시보드 (#95)", () => {
  test.beforeEach(async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_GROUPS) })
    );
    await login(page);
  });

  test("빈 장부 상태 메시지 표시", async ({ page }) => {
    await expect(page.getByText("아직 장부가 없어요.")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("첫 장부를 만들어보세요.")).toBeVisible();
  });

  test("장부 만들기 버튼 → /settings 링크", async ({ page }) => {
    const btn = page.getByRole("link", { name: "장부 만들기" }).first();
    await expect(btn).toBeVisible({ timeout: 5000 });
    await expect(btn).toHaveAttribute("href", "/settings");
  });

  test("에러 메시지 미표시", async ({ page }) => {
    await expect(page.getByText("장부를 불러오지 못했습니다.")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("데이터를 불러오지 못했습니다.")).not.toBeVisible();
  });
});

test.describe("빈 장부 상태 — 히스토리 (#95)", () => {
  test.beforeEach(async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EMPTY_GROUPS) })
    );
    await login(page);
    await page.goto("/history");
  });

  test("빈 장부 상태 메시지 표시", async ({ page }) => {
    await expect(page.getByText("아직 장부가 없어요.")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("link", { name: "장부 만들기" })).toBeVisible();
  });

  test("+ 새 스냅샷 버튼 미표시", async ({ page }) => {
    await expect(page.getByText("아직 장부가 없어요.")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("link", { name: /새 스냅샷/i })).not.toBeVisible();
  });

  test("에러 메시지 미표시", async ({ page }) => {
    await expect(page.getByText("장부가 없습니다.")).not.toBeVisible({ timeout: 5000 });
  });
});
