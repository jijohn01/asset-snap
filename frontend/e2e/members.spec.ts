import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

// 오너 권한의 그룹만 설정 페이지에서 멤버 관리 UI가 노출됨
const MOCK_GROUPS = [{ id: "g1", name: "내 장부", type: "personal", role: "owner", member_count: 1 }];
const MOCK_MEMBER_USER2 = { user_id: "user2", display_name: "게스트", role: "editor" };

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
}

async function setupGroupMocks(page: Page, members: object[], onPostGroup?: () => object) {
  await page.route("**/api/v1/asset-groups/", async (route) => {
    if (route.request().method() === "POST") {
      const newGroup = onPostGroup?.() ?? { id: "g2", name: "우리 가족", type: "group", role: "owner", member_count: 1 };
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(newGroup) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GROUPS) });
  });
  await page.route("**/api/v1/asset-groups/g1/members", async (route) => {
    if (route.request().method() === "POST") {
      members.push(MOCK_MEMBER_USER2);
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(MOCK_MEMBER_USER2) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(members) });
  });
  await page.route("**/api/v1/asset-groups/g1/members/user2", async (route) => {
    if (route.request().method() === "PUT") {
      const body = JSON.parse((await route.request().postData()) ?? "{}");
      const idx = members.findIndex((m: any) => m.user_id === "user2");
      if (idx >= 0) (members[idx] as any).role = body.role;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...MOCK_MEMBER_USER2, role: body.role }) });
    }
    if (route.request().method() === "DELETE") {
      const idx = members.findIndex((m: any) => m.user_id === "user2");
      if (idx >= 0) members.splice(idx, 1);
      return route.fulfill({ status: 204 });
    }
    return route.continue();
  });
  // 스냅샷 API mock (설정 페이지 진입 시 대시보드가 fetchSnapshots를 호출)
  await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  );
}

test.describe("멤버 관리 (#54)", () => {
  test("새 그룹 생성", async ({ page }) => {
    if (!PASSWORD) test.skip();
    const members: object[] = [];
    await setupGroupMocks(page, members);
    await login(page);
    await page.goto("/settings");

    // "+ 새 가족 장부 만들기" 버튼 클릭
    await page.click('button:text("새 가족 장부 만들기")');
    await page.fill('input[placeholder="장부 이름 (예: 우리 가족)"]', "우리 가족");
    await page.click('button:text("만들기")');

    // 새 그룹 카드가 나타나야 함
    await expect(page.getByText("우리 가족")).toBeVisible({ timeout: 5000 });
  });

  test("이메일로 멤버 초대", async ({ page }) => {
    if (!PASSWORD) test.skip();
    const members: object[] = [];
    await setupGroupMocks(page, members);
    await login(page);
    await page.goto("/settings");

    // 이메일 입력 후 초대
    await page.fill('input[placeholder="이메일 주소"]', "guest@example.com");
    await page.click('button:text("초대")');

    // 초대된 멤버 이름이 멤버 목록에 나타나야 함
    await expect(page.getByText("게스트")).toBeVisible({ timeout: 5000 });
  });

  test("멤버 역할 변경", async ({ page }) => {
    if (!PASSWORD) test.skip();
    const members: object[] = [{ ...MOCK_MEMBER_USER2 }];
    await setupGroupMocks(page, members);
    await login(page);
    await page.goto("/settings");

    // 게스트 행의 역할 select를 viewer로 변경
    await page.waitForSelector('span:text-is("게스트")', { timeout: 5000 });
    const guestRow = page.locator('div').filter({ hasText: /^게스트$/ }).filter({ has: page.locator('select') });
    await guestRow.locator('select').selectOption("viewer");

    // 변경 후 select 값이 viewer로 유지되어야 함
    await expect(guestRow.locator('select')).toHaveValue("viewer");
  });

  test("멤버 제거", async ({ page }) => {
    if (!PASSWORD) test.skip();
    const members: object[] = [{ ...MOCK_MEMBER_USER2 }];
    await setupGroupMocks(page, members);
    await login(page);
    await page.goto("/settings");

    // 제거 버튼 클릭
    await page.waitForSelector('span:text-is("게스트")', { timeout: 5000 });
    await expect(page.getByText("게스트")).toBeVisible();
    await page.click('button:text("제거")');

    // 멤버가 목록에서 사라져야 함
    await expect(page.getByText("게스트")).not.toBeVisible({ timeout: 5000 });
  });
});
