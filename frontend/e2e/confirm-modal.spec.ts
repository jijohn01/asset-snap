import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "test-history@assetnavigator.test";
const PASSWORD = process.env.TEST_PASSWORD ?? "TestPassword123!";

const MOCK_GROUP = [{ id: "g1", name: "내 장부", role: "owner", member_count: 1 }];
const MOCK_SNAPSHOTS = [
  {
    id: "s1",
    group_id: "g1",
    snapshot_month: "2026-06-01",
    data: {
      item1: { label: "CMA", category: "assets.cash_savings", sort_order: 0, memo: "", amount: 5000 },
    },
    metrics: {
      net_worth: 5000,
      equity_ratio: 100,
      monthly_income: 0,
      monthly_surplus: 0,
      total_assets: 5000,
      total_liabilities: 0,
      monthly_expenses: 0,
      household_balance: 0,
      emergency_fund: 0,
      annual_surplus: 0,
      annual_savings: 0,
      annual_asset_increase: 0,
      projected_year_end_assets: 0,
    },
    created_at: "2026-06-01T00:00:00Z",
  },
];

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
}

test.describe("ConfirmModal — 로그아웃", () => {
  test("로그아웃 버튼 클릭 시 모달 표시", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await login(page);
    // Topbar logout button (not inside modal)
    await page.locator('button:has-text("로그아웃")').first().click();
    await expect(page.locator('h2:has-text("로그아웃")')).toBeVisible({ timeout: 3000 });
  });

  test("로그아웃 모달 취소 시 현재 페이지 유지", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await login(page);
    await page.locator('button:has-text("로그아웃")').first().click();
    await expect(page.locator('h2:has-text("로그아웃")')).toBeVisible({ timeout: 3000 });
    await page.locator('button:has-text("취소")').click();
    await expect(page.locator('h2:has-text("로그아웃")')).not.toBeVisible();
    // Should still be on dashboard, not redirected to /login
    await expect(page).toHaveURL("/");
  });

  test("로그아웃 모달 확인 시 /login 으로 이동", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await login(page);
    await page.locator('button:has-text("로그아웃")').first().click();
    await expect(page.locator('h2:has-text("로그아웃")')).toBeVisible({ timeout: 3000 });
    // The confirm button inside the fixed modal overlay also has text "로그아웃"
    await page.locator('.fixed button:has-text("로그아웃")').click();
    await page.waitForURL("/login", { timeout: 8000 });
  });
});

test.describe("ConfirmModal — 히스토리 스냅샷 삭제 (API mock)", () => {
  test("삭제 버튼 클릭 시 모달 표시", async ({ page }) => {
    if (!PASSWORD) test.skip();
    // Set up API mocks before login so they intercept calls during navigation
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUP) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SNAPSHOTS) })
    );
    await login(page);
    await page.goto("/history");

    // Click the first snapshot row to expand the inline form
    await page.locator("button").filter({ hasText: /2026년 6월/ }).first().click();

    // The SnapshotForm delete button inside the expanded accordion
    const deleteBtn = page.locator('button:has-text("스냅샷 삭제")').first();
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    await expect(page.locator('h2:has-text("스냅샷 삭제")')).toBeVisible({ timeout: 3000 });
  });

  test("Esc 키로 모달 닫힘", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUP) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SNAPSHOTS) })
    );
    await login(page);
    await page.goto("/history");

    await page.locator("button").filter({ hasText: /2026년 6월/ }).first().click();
    const deleteBtn = page.locator('button:has-text("스냅샷 삭제")').first();
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    await expect(page.locator('h2:has-text("스냅샷 삭제")')).toBeVisible({ timeout: 3000 });
    await page.keyboard.press("Escape");
    await expect(page.locator('h2:has-text("스냅샷 삭제")')).not.toBeVisible();
  });
});
