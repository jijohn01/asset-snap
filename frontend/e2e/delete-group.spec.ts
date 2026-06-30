import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

const MOCK_GROUPS = [
  { id: "g1", name: "내 장부", role: "owner", member_count: 2 },
  { id: "g2", name: "가족 장부", role: "owner", member_count: 1 },
];

const MOCK_MEMBERS_G1 = [
  { user_id: "u1", display_name: "나", email: "me@test.com", role: "owner" },
  { user_id: "u2", display_name: "홍길동", email: "gd@test.com", role: "editor" },
];

const MOCK_MEMBERS_G2 = [
  { user_id: "u1", display_name: "나", email: "me@test.com", role: "owner" },
];

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
}

function mockGroupsAndMembers(page: Page) {
  page.route("**/api/v1/asset-groups/", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUPS) })
  );
  page.route("**/api/v1/asset-groups/g1/members", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_MEMBERS_G1) })
  );
  page.route("**/api/v1/asset-groups/g2/members", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_MEMBERS_G2) })
  );
}

test.describe("장부 삭제", () => {
  test.skip(!process.env.TEST_EMAIL, "TEST_EMAIL 환경변수 필요");

  test("owner 장부에 휴지통 버튼 표시", async ({ page }) => {
    mockGroupsAndMembers(page);
    await login(page);
    await page.goto("/settings");

    // owner 장부 2개 → 휴지통 버튼 2개 노출
    const trashBtns = page.getByTitle("장부 삭제");
    await expect(trashBtns).toHaveCount(2);
  });

  test("1단계 모달: 장부 삭제 경고 + 멤버 수 포함", async ({ page }) => {
    mockGroupsAndMembers(page);
    await login(page);
    await page.goto("/settings");

    // 첫 번째 장부(멤버 2명) 삭제 버튼 클릭
    await page.getByTitle("장부 삭제").first().click();

    await expect(page.getByText("장부를 삭제할까요?")).toBeVisible();
    await expect(page.getByText(/멤버가 2명 있습니다/)).toBeVisible();
    await expect(page.getByText(/영구 삭제됩니다/)).toBeVisible();
    await expect(page.getByRole("button", { name: "계속" })).toBeVisible();
  });

  test("1단계에서 취소 클릭 시 모달 닫힘", async ({ page }) => {
    mockGroupsAndMembers(page);
    await login(page);
    await page.goto("/settings");

    await page.getByTitle("장부 삭제").first().click();
    await expect(page.getByText("장부를 삭제할까요?")).toBeVisible();

    await page.getByRole("button", { name: "취소" }).click();

    await expect(page.getByText("장부를 삭제할까요?")).not.toBeVisible();
    await expect(page.getByText("내 장부")).toBeVisible();
  });

  test("2단계 모달: 이름 불일치 시 삭제 버튼 비활성", async ({ page }) => {
    mockGroupsAndMembers(page);
    await login(page);
    await page.goto("/settings");

    await page.getByTitle("장부 삭제").first().click();
    await page.getByRole("button", { name: "계속" }).click();

    await expect(page.getByText("정말 삭제할까요?")).toBeVisible();
    // 잘못된 이름 입력
    await page.getByPlaceholder("내 장부").fill("틀린 이름");
    await expect(page.getByRole("button", { name: "삭제" })).toBeDisabled();
  });

  test("2단계 모달: 이름 일치 시 삭제 버튼 활성 → 삭제 성공 후 카드 제거", async ({ page }) => {
    mockGroupsAndMembers(page);
    page.route("**/api/v1/asset-groups/g1", (route) =>
      route.fulfill({ status: 204, body: "" })
    );
    await login(page);
    await page.goto("/settings");

    await page.getByTitle("장부 삭제").first().click();
    await page.getByRole("button", { name: "계속" }).click();

    await page.getByPlaceholder("내 장부").fill("내 장부");
    const deleteBtn = page.getByRole("button", { name: "삭제" });
    await expect(deleteBtn).not.toBeDisabled();
    await deleteBtn.click();

    await expect(page.getByText("정말 삭제할까요?")).not.toBeVisible();
    await expect(page.getByText("내 장부")).not.toBeVisible();
    // 나머지 장부는 유지
    await expect(page.getByText("가족 장부")).toBeVisible();
  });

  test("Esc 키로 모달 닫기", async ({ page }) => {
    mockGroupsAndMembers(page);
    await login(page);
    await page.goto("/settings");

    await page.getByTitle("장부 삭제").first().click();
    await expect(page.getByText("장부를 삭제할까요?")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByText("장부를 삭제할까요?")).not.toBeVisible();
    await expect(page.getByText("내 장부")).toBeVisible();
  });
});
