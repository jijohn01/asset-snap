import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "jijohn01@naver.com";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

const MOCK_GROUP = [{ id: "g1", name: "내 장부", type: "personal", role: "owner", member_count: 1 }];
const MOCK_SNAPSHOT = [
  {
    id: "s1",
    snapshot_month: "2026-06-01",
    data: { item1: { label: "CMA", category: "assets.cash_savings", sort_order: 0, memo: "", amount: 5000 } },
    metrics: { net_worth: 5000, equity_ratio: 100, monthly_income: 0, monthly_surplus: 0 },
  },
];

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
}

test.describe("대시보드", () => {
  test.beforeEach(async ({ page }) => {
    if (!PASSWORD) test.skip();
    await login(page);
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

test.describe("대시보드 차트 크기 및 empty state (#39)", () => {
  test("데이터 없을 때 '첫 스냅샷 입력하기' 버튼 표시 및 /snapshot/new 링크 확인", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUP) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    );
    await login(page);

    const cta = page.getByRole("link", { name: "첫 스냅샷 입력하기" });
    await expect(cta).toBeVisible({ timeout: 5000 });
    await expect(cta).toHaveAttribute("href", "/snapshot/new");
  });

  test("로딩 중 '불러오는 중...' 표시, '첫 스냅샷 입력하기' 버튼 없음", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUP) })
    );
    // 스냅샷 응답을 의도적으로 지연
    await page.route("**/api/v1/asset-groups/g1/snapshots/", async (route) => {
      await new Promise((r) => setTimeout(r, 4000));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });
    await login(page);

    await expect(page.getByText("불러오는 중...")).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("link", { name: "첫 스냅샷 입력하기" })).not.toBeVisible();
  });

  test("데이터 있을 때 막대차트 height ≥ 220px, 파이차트 height ≥ 200px", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await page.route("**/api/v1/asset-groups/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUP) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SNAPSHOT) })
    );
    await login(page);

    // 차트 렌더링 대기
    await page.waitForSelector(".recharts-responsive-container", { timeout: 5000 });
    await page.waitForTimeout(500);

    const containers = page.locator(".recharts-responsive-container");
    const barHeight = await containers.first().evaluate((el) => el.getBoundingClientRect().height);
    const pieHeight = await containers.last().evaluate((el) => el.getBoundingClientRect().height);

    expect(barHeight).toBeGreaterThanOrEqual(220);
    expect(pieHeight).toBeGreaterThanOrEqual(200);
  });
});
