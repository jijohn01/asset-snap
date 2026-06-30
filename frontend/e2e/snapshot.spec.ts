import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

const MOCK_GROUP = [{ id: "g1", name: "내 장부", role: "owner", member_count: 1 }];

const MOCK_SNAPSHOT = {
  id: "s1",
  snapshot_month: "2026-06-01",
  data: { item1: { label: "CMA", category: "assets.cash_savings", sort_order: 0, memo: "", amount: 5000 } },
  metrics: { net_worth: 5000, equity_ratio: 100, monthly_income: 0, monthly_surplus: 0, total_assets: 5000, total_liabilities: 0 },
};

const PREFILL_DATA = {
  item1: { label: "CMA", category: "assets.cash_savings", sort_order: 0, memo: "", amount: 5000 },
};

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
}

async function mockGroups(page: Page) {
  await page.route("**/api/v1/asset-groups/", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUP) });
    }
    return route.continue();
  });
}

test.describe("스냅샷 CRUD (#54)", () => {
  test("전월 미리채움(prefill) 동작 확인", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await mockGroups(page);
    await page.route("**/api/v1/asset-groups/g1/snapshots/prefill*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA) })
    );
    await login(page);
    await page.goto("/snapshot/new");

    // prefill 로드 후 CMA 항목이 나타나야 함
    await expect(page.locator('span:text-is("CMA")')).toBeVisible({ timeout: 5000 });
    // 금액 5000이 채워져 있어야 함
    const amountInput = page.locator('input[type="number"]').first();
    await expect(amountInput).toHaveValue("5000");
  });

  test("새 스냅샷 입력 → 저장 → 히스토리에서 확인", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await mockGroups(page);
    await page.route("**/api/v1/asset-groups/g1/snapshots/prefill*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PREFILL_DATA) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/", async (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(MOCK_SNAPSHOT) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_SNAPSHOT]) });
    });
    await login(page);
    await page.goto("/snapshot/new");

    await page.waitForSelector('button:text("저장")', { timeout: 5000 });
    await page.click('button:text("저장")');
    await page.waitForURL("/history", { timeout: 8000 });
    await expect(page.getByText("2026년 6월")).toBeVisible();
  });

  test("기존 스냅샷 수정 → 변경값 반영 확인", async ({ page }) => {
    if (!PASSWORD) test.skip();
    const updatedSnapshot = {
      ...MOCK_SNAPSHOT,
      data: { item1: { ...MOCK_SNAPSHOT.data.item1, amount: 9000 } },
      metrics: { ...MOCK_SNAPSHOT.metrics, net_worth: 9000, total_assets: 9000 },
    };
    // GET 목록은 상태에 따라 반환값이 바뀜
    let currentSnapshots = [MOCK_SNAPSHOT];

    await mockGroups(page);
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(currentSnapshots) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/s1", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SNAPSHOT) });
      }
      if (route.request().method() === "PUT") {
        currentSnapshots = [updatedSnapshot];
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(updatedSnapshot) });
      }
      return route.continue();
    });
    await login(page);
    await page.goto("/history");

    await page.waitForSelector('a:text("보기 / 수정")', { timeout: 5000 });
    await page.click('a:text("보기 / 수정")');
    await page.waitForURL(/\/snapshot\/s1/, { timeout: 5000 });

    // 금액 변경
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill("9000");

    await page.click('button:text("수정 저장")');
    await page.waitForURL("/history", { timeout: 8000 });
    // 수정된 순자산(9,000만원)이 히스토리에 표시되어야 함
    await expect(page.getByText("순자산 9,000만원")).toBeVisible();
  });

  test("스냅샷 삭제 → 인라인 확인 후 히스토리에서 제거", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await mockGroups(page);
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_SNAPSHOT]) })
    );
    await page.route("**/api/v1/asset-groups/g1/snapshots/s1", async (route) => {
      if (route.request().method() === "DELETE") {
        return route.fulfill({ status: 204 });
      }
      return route.continue();
    });

    await login(page);
    await page.goto("/history");

    await page.waitForSelector('button:text("삭제")', { timeout: 5000 });
    await expect(page.getByText("2026년 6월")).toBeVisible();

    // 삭제 버튼 클릭 → 인라인 confirm UI 표시
    await page.click('button:text("삭제")');
    await expect(page.getByTestId("confirm-delete")).toBeVisible({ timeout: 2000 });
    await expect(page.getByTestId("confirm-cancel")).toBeVisible({ timeout: 2000 });

    // 인라인 [삭제] 버튼 클릭 → 항목 제거
    await page.getByTestId("confirm-delete").click();
    await expect(page.getByText("2026년 6월")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("아직 스냅샷이 없어요.")).toBeVisible();
  });

  test("스냅샷 삭제 취소 → 항목 유지", async ({ page }) => {
    if (!PASSWORD) test.skip();
    await mockGroups(page);
    await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_SNAPSHOT]) })
    );

    await login(page);
    await page.goto("/history");

    await page.waitForSelector('button:text("삭제")', { timeout: 5000 });

    // 삭제 버튼 클릭 → 인라인 confirm 표시
    await page.click('button:text("삭제")');
    await expect(page.getByTestId("confirm-delete")).toBeVisible({ timeout: 2000 });

    // [취소] 클릭 → confirm 해제, 항목 유지
    await page.getByTestId("confirm-cancel").click();
    await expect(page.getByTestId("confirm-delete")).not.toBeVisible();
    await expect(page.getByText("2026년 6월")).toBeVisible();
  });
});
