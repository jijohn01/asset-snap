# 장부 탈퇴 구현 계획 — 이슈 #65

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** editor/viewer 멤버가 설정 페이지에서 직접 장부를 탈퇴할 수 있게 한다.

**Architecture:** 기존 `ConfirmModal` 컴포넌트와 `removeMember` API 함수를 재사용한다. `settings/page.tsx`에 탈퇴 대상 state와 핸들러를 추가하고, 비owner 장부 카드에 "탈퇴" 버튼을 렌더링한다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Playwright (e2e)

## Global Constraints

- 파일 수정 대상: `frontend/src/app/(app)/settings/page.tsx`, `frontend/e2e/leave-group.spec.ts` (신규)
- 신규 컴포넌트/API 함수 추가 없음 — 기존 `ConfirmModal`, `removeMember`, `setActiveGroupId` 재사용
- 탈퇴 버튼은 `group.type !== "personal"` 이고 `group.role !== "owner"` 인 경우에만 노출
- 모달 문구: 제목 `"장부 탈퇴"`, 설명 `"${groupName}에서 탈퇴합니다. 다시 참여하려면 owner의 초대가 필요합니다."`, 확인 버튼 `"탈퇴"`
- 탈퇴 후 해당 그룹이 활성 장부였으면 personal 장부로 `setActiveGroupId` 전환
- e2e 테스트는 실 계정 (`TEST_EMAIL` / `TEST_PASSWORD`) 대신 API mock 사용

---

### Task 1: 탈퇴 UI + 핸들러 구현

**Files:**
- Modify: `frontend/src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes:
  - `removeMember(groupId: string, userId: string): Promise<void>` — 이미 import됨
  - `setActiveGroupId(id: string): void` — 이미 import됨
  - `ConfirmModal` — 이미 import됨
  - `currentUserId: string | null` — 이미 state에 있음
  - `groups: Group[]` — 이미 state에 있음
- Produces: 없음 (단독 완결 작업)

**배경:**

현재 `settings/page.tsx` 상태:
- `groups`, `currentUserId` 등의 state는 이미 선언되어 있음
- `removeTarget` state (`{ groupId, userId, name }`)와 `handleRemoveMember` 함수가 이미 존재 — owner가 타인을 제거할 때 사용
- 비owner 장부 카드 하단에는 "멤버 관리는 owner만 가능합니다." 텍스트만 있음
- 카드 헤더 버튼 영역: `!isOwner && !isEditing` 분기에 "보기" 버튼만 있음

**작업 내용:**

- [ ] **Step 1: `leaveTarget` state 추가**

`frontend/src/app/(app)/settings/page.tsx`의 기존 `removeTarget` state 선언 바로 아래(line 64 부근)에 추가:

```tsx
const [leaveTarget, setLeaveTarget] = useState<{ groupId: string; groupName: string } | null>(null);
```

- [ ] **Step 2: `handleLeaveGroup` 핸들러 추가**

`handleRemoveMember` 함수(line 175 부근) 바로 아래에 추가:

```tsx
async function handleLeaveGroup(groupId: string) {
  if (!currentUserId) return;
  await removeMember(groupId, currentUserId);
  const personalGroup = groups.find((g) => g.type === "personal");
  const activeId = typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
  if (activeId === groupId && personalGroup) {
    setActiveGroupId(personalGroup.id);
  }
  setGroups((prev) => prev.filter((g) => g.id !== groupId));
}
```

- [ ] **Step 3: 탈퇴 버튼 추가 (카드 헤더)**

카드 헤더 버튼 영역에서 `!isOwner && !isEditing` 분기(line 288 부근)를 찾아 "보기" 버튼 앞에 탈퇴 버튼 추가:

변경 전 (`!isOwner && !isEditing` 분기 안):
```tsx
<>
  {isOwner && (
    <button
      onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
      className="rounded-lg p-1.5 text-[#b0b8c1] hover:text-[#4e5968] hover:bg-[#f2f4f6] active:scale-[0.97] transition-all"
      title="이름 변경"
    >
      <Pencil size={13} />
    </button>
  )}
  <button
    onClick={() => handleSwitchGroup(group)}
    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#2272eb] bg-[rgba(100,168,255,0.15)] hover:bg-[rgba(100,168,255,0.25)] active:scale-[0.97] transition-all"
  >
    보기
  </button>
</>
```

변경 후:
```tsx
<>
  {isOwner && (
    <button
      onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
      className="rounded-lg p-1.5 text-[#b0b8c1] hover:text-[#4e5968] hover:bg-[#f2f4f6] active:scale-[0.97] transition-all"
      title="이름 변경"
    >
      <Pencil size={13} />
    </button>
  )}
  {!isOwner && group.type !== "personal" && (
    <button
      onClick={() => setLeaveTarget({ groupId: group.id, groupName: group.name })}
      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#f04452] bg-[rgba(240,68,82,0.08)] hover:bg-[rgba(240,68,82,0.15)] active:scale-[0.97] transition-all"
    >
      탈퇴
    </button>
  )}
  <button
    onClick={() => handleSwitchGroup(group)}
    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#2272eb] bg-[rgba(100,168,255,0.15)] hover:bg-[rgba(100,168,255,0.25)] active:scale-[0.97] transition-all"
  >
    보기
  </button>
</>
```

- [ ] **Step 4: 탈퇴 ConfirmModal 추가**

파일 맨 아래 기존 `removeTarget` ConfirmModal 바로 아래(line 504 부근)에 추가:

```tsx
<ConfirmModal
  open={leaveTarget !== null}
  title="장부 탈퇴"
  description={`${leaveTarget?.groupName}에서 탈퇴합니다. 다시 참여하려면 owner의 초대가 필요합니다.`}
  confirmLabel="탈퇴"
  onConfirm={() => {
    if (leaveTarget) handleLeaveGroup(leaveTarget.groupId);
    setLeaveTarget(null);
  }}
  onCancel={() => setLeaveTarget(null)}
/>
```

- [ ] **Step 5: TypeScript 컴파일 확인**

```powershell
cd frontend
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/app/(app)/settings/page.tsx
git commit -m "feat: 장부 탈퇴 버튼 및 확인 모달 추가 (#65)"
```

---

### Task 2: Playwright e2e 테스트

**Files:**
- Create: `frontend/e2e/leave-group.spec.ts`

**Interfaces:**
- Consumes: Task 1에서 구현된 "탈퇴" 버튼, `ConfirmModal`
- Produces: 없음

**배경:**

기존 e2e 패턴(`frontend/e2e/confirm-modal.spec.ts` 참고):
- `TEST_EMAIL` / `TEST_PASSWORD` 환경변수로 테스트 계정 로그인
- API mock은 `login()` 호출 전에 설정해야 적용됨
- groups 엔드포인트 mock 필수: `**/api/v1/asset-groups/`
- DELETE 엔드포인트도 mock: `**/api/v1/asset-groups/g2/members/**`

테스트 시나리오:
1. settings 페이지에서 비owner 장부에 "탈퇴" 버튼이 보임
2. owner 장부 / personal 장부에는 "탈퇴" 버튼이 없음
3. "탈퇴" 클릭 → 확인 모달 표시
4. 취소 → 모달 닫힘, 장부 카드 유지
5. 확인(탈퇴) → 장부 카드가 목록에서 사라짐

- [ ] **Step 1: 테스트 파일 작성**

`frontend/e2e/leave-group.spec.ts` 신규 생성:

```typescript
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
    const familyCard = page.locator("text=가족 장부").locator("..").locator("..");
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
```

- [ ] **Step 2: 테스트 실행 (dev 서버 실행 중이어야 함)**

```powershell
cd frontend
npm run test:e2e -- --grep "장부 탈퇴"
```

Expected:
- `TEST_EMAIL` 미설정 시 모든 테스트 skip
- `TEST_EMAIL` 설정 시 5개 테스트 PASS

- [ ] **Step 3: 커밋**

```bash
git add frontend/e2e/leave-group.spec.ts
git commit -m "test: 장부 탈퇴 e2e 테스트 추가 (#65)"
```
