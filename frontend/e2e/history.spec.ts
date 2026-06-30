import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

const MOCK_GROUP = [{ id: "g1", name: "내 장부", role: "owner", member_count: 1 }];
const MOCK_SNAPSHOTS = [
  {
    id: "s1",
    group_id: "g1",
    snapshot_month: "2026-06-01",
    data: { item1: { label: "CMA", category: "assets.cash_savings", sort_order: 0, memo: "", amount: 5000 } },
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

async function loginAndGoToHistory(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
  await page.goto("/history");
}

test.describe("월별 이력 에러/빈 상태 (#51)", () => {
  test("API 에러 시 에러 카드 표시, '아직 스냅샷이 없어요.' 미표시", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUP) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "서버 오류" }) })
    );
    await loginAndGoToHistory(page);

    await expect(page.getByText("스냅샷 목록을 불러오지 못했습니다.")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("아직 스냅샷이 없어요.")).not.toBeVisible();
  });

  test("데이터 없을 때 '아직 스냅샷이 없어요.' 표시 및 CTA 링크 확인", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUP) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    );
    await loginAndGoToHistory(page);

    await expect(page.getByText("아직 스냅샷이 없어요.")).toBeVisible({ timeout: 5000 });
    const cta = page.getByRole("link", { name: "첫 스냅샷 입력하기" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/snapshot/new");
  });

  test("데이터 있을 때 스냅샷 목록 렌더, 빈 상태 메시지 미표시", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUP) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SNAPSHOTS) })
    );
    await loginAndGoToHistory(page);

    await expect(page.getByText("2026년 6월")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("아직 스냅샷이 없어요.")).not.toBeVisible();
  });
});
