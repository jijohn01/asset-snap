import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "test-history@assetnavigator.test";
const PASSWORD = process.env.TEST_PASSWORD ?? "TestPassword123!";

const MOCK_GROUPS = [
  { id: "g1", name: "내 장부", type: "personal", role: "owner", member_count: 1 },
  { id: "g2", name: "가족 장부", type: "group", role: "editor", member_count: 3 },
];

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
}

function mockGroups(page: Page, groups = MOCK_GROUPS) {
  return page.route("**/api/v1/asset-groups/", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(groups),
    })
  );
}

test.describe("장부 탈퇴", () => {
  test.skip(!process.env.TEST_EMAIL, "TEST_EMAIL 환경변수 필요");

  test("비owner 장부에 탈퇴 버튼이 보임", async ({ page }) => {
    await mockGroups(page);
    await login(page);
    await page.goto("/settings");

    // 가족 장부(editor)에 탈퇴 버튼 있음
    await expect(page.getByRole("button", { name: "탈퇴" })).toBeVisible();
  });

  test("personal/owner 장부에 탈퇴 버튼 없음", async ({ page }) => {
    await mockGroups(page);
    await login(page);
    await page.goto("/settings");

    // "내 장부"(personal, owner) 카드에는 탈퇴 버튼 없음
    // owner가 하나이면 탈퇴 버튼 전체 수 = 비owner 장부 수 = 1
    await expect(page.getByRole("button", { name: "탈퇴" })).toHaveCount(1);
  });

  test("탈퇴 버튼 클릭 시 확인 모달이 열림", async ({ page }) => {
    await mockGroups(page);
    await login(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "탈퇴" }).click();

    await expect(page.getByText("장부 탈퇴")).toBeVisible();
    await expect(
      page.getByText("가족 장부에서 탈퇴합니다. 다시 참여하려면 owner의 초대가 필요합니다.")
    ).toBeVisible();
  });

  test("취소 클릭 시 모달이 닫히고 카드 유지", async ({ page }) => {
    await mockGroups(page);
    await login(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "탈퇴" }).click();
    await expect(page.getByText("장부 탈퇴")).toBeVisible();

    await page.getByRole("button", { name: "취소" }).click();

    await expect(page.getByText("장부 탈퇴")).not.toBeVisible();
    await expect(page.getByText("가족 장부")).toBeVisible();
  });

  test("탈퇴 확인 시 카드가 목록에서 사라짐", async ({ page }) => {
    await mockGroups(page);
    await page.route("**/api/v1/asset-groups/g2/members/**", (route) =>
      route.fulfill({ status: 204, body: "" })
    );
    await login(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "탈퇴" }).click();
    await page.getByRole("button", { name: "탈퇴" }).last().click();

    await expect(page.getByText("가족 장부")).not.toBeVisible();
  });

  test("Esc로 모달 닫기", async ({ page }) => {
    await mockGroups(page);
    await login(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "탈퇴" }).click();
    await expect(page.getByText("장부 탈퇴")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByText("장부 탈퇴")).not.toBeVisible();
    await expect(page.getByText("가족 장부")).toBeVisible();
  });
});
