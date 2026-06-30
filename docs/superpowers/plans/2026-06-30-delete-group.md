# 장부 삭제 (이슈 #67) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settings 페이지에서 owner가 장부를 2단계 확인을 거쳐 영구 삭제할 수 있도록 구현한다.

**Architecture:** ConfirmModal에 `children`/`confirmDisabled` prop을 추가해 step 2 이름 입력 모달을 재사용한다. api.ts에 `deleteGroup()` 함수를 추가하고, settings 페이지에 휴지통 버튼 + 상태 + 핸들러 + 두 개의 ConfirmModal을 추가한다. Backend DELETE 엔드포인트는 이미 존재하므로 frontend 작업만 필요하다.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, lucide-react

## Global Constraints

- TypeScript strict — 타입 오류 없이 빌드 가능해야 함
- Tailwind CSS v4 — CSS vars 패턴 유지, `clsx` 사용
- lucide-react 아이콘만 사용
- 컴포넌트 Props interface는 기존 파일 내부에 정의된 패턴 유지
- e2e 테스트: `TEST_EMAIL` 환경변수 미설정 시 skip 처리 필수
- e2e API mock: `page.route("**/api/v1/asset-groups/", ...)` 패턴 사용
- 커밋: `git add <specific-files>` (git add -A 금지)
- 워크트리 경로: `C:\Users\Jisoo\Projects\AssetNavigator\.claude\worktrees\refactor+93-remove-group-type`

---

## File Map

| 파일 | 작업 |
|------|------|
| `frontend/src/components/ConfirmModal.tsx` | Modify — `children?`, `confirmDisabled?` prop 추가 |
| `frontend/src/lib/api.ts` | Modify — `deleteGroup()` 함수 추가 |
| `frontend/src/app/(app)/settings/page.tsx` | Modify — 삭제 버튼 + 상태 + 핸들러 + 2개 ConfirmModal |
| `frontend/e2e/delete-group.spec.ts` | Create — e2e 테스트 |

---

## Task 1: ConfirmModal 확장 + deleteGroup API 함수

**Files:**
- Modify: `frontend/src/components/ConfirmModal.tsx`
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: 없음 (기존 `apiFetch`, `authHeader` 사용)
- Produces:
  - `ConfirmModal` — 새 props: `children?: React.ReactNode`, `confirmDisabled?: boolean`
  - `deleteGroup(groupId: string): Promise<void>` — api.ts export

- [ ] **Step 1: ConfirmModal interface + 구현 수정**

`frontend/src/components/ConfirmModal.tsx` 전체를 아래로 교체한다:

```tsx
"use client";

import { useEffect } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  confirmDisabled,
  children,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-[#191f28]">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm text-[#8b95a1]">{description}</p>
        )}
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-[#4e5968] bg-[#f2f4f6] hover:bg-[#e8ecf0] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-[#F04452] hover:bg-[#d93a47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: api.ts에 deleteGroup 추가**

`frontend/src/lib/api.ts`에서 `removeMember` 함수(약 line 175) 바로 다음에 아래 함수를 삽입한다:

```ts
export async function deleteGroup(groupId: string): Promise<void> {
  await apiFetch(`${API_URL}/api/v1/asset-groups/${groupId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
```

- [ ] **Step 3: TypeScript 빌드로 타입 검증**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음 (또는 기존에 있던 오류만)

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/components/ConfirmModal.tsx frontend/src/lib/api.ts
git commit -m "feat: ConfirmModal children/confirmDisabled prop 추가 + deleteGroup API 함수 (#67)"
```

---

## Task 2: Settings 페이지 — 장부 삭제 플로우

**Files:**
- Modify: `frontend/src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes:
  - `deleteGroup(groupId: string): Promise<void>` (Task 1)
  - `resetGroupIdCache(): void` (from `frontend/src/lib/api.ts` — 기존 export)
  - `ConfirmModal` with `children`, `confirmDisabled` props (Task 1)
- Produces: 완성된 삭제 UI (휴지통 버튼 + 2단계 확인 모달)

- [ ] **Step 1: imports 수정**

Line 4의 lucide import에 `Trash2` 추가:
```tsx
import { Users, Plus, X, Pencil, Check, Trash2 } from "lucide-react";
```

Line 6-18의 api import에 `deleteGroup`, `resetGroupIdCache` 추가:
```tsx
import {
  fetchGroups,
  fetchGroupMembers,
  createGroup,
  updateGroup,
  inviteMember,
  updateMemberRole,
  removeMember,
  transferOwnership,
  deleteGroup,
  setActiveGroupId,
  resetGroupIdCache,
  type Group,
  type Member,
} from "@/lib/api";
```

- [ ] **Step 2: 삭제 관련 state 추가**

Line 65 (`const [leaveTarget, ...`) 바로 다음에 아래 5개 state를 삽입한다:

```tsx
  const [deleteTarget, setDeleteTarget] = useState<{ groupId: string; groupName: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteNameInput, setDeleteNameInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
```

- [ ] **Step 3: handleDeleteGroup + handleDeleteCancel 함수 추가**

`handleLeaveGroup` 함수(약 line 184) 바로 다음에 아래 두 함수를 삽입한다:

```tsx
  function handleDeleteCancel() {
    setDeleteTarget(null);
    setDeleteStep(1);
    setDeleteNameInput("");
    setDeleteError("");
  }

  async function handleDeleteGroup() {
    if (!deleteTarget || deleteNameInput !== deleteTarget.groupName) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await deleteGroup(deleteTarget.groupId);
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.groupId));
      setMembersByGroup((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.groupId];
        return next;
      });
      const activeId = typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
      if (activeId === deleteTarget.groupId) {
        const remaining = groups.filter((g) => g.id !== deleteTarget.groupId);
        if (remaining.length > 0) {
          setActiveGroupId(remaining[0].id);
        } else {
          resetGroupIdCache();
          if (typeof window !== "undefined") localStorage.removeItem("activeGroupId");
        }
      }
      window.dispatchEvent(new CustomEvent("group-changed"));
      handleDeleteCancel();
    } catch {
      setDeleteError("삭제에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setDeleteLoading(false);
    }
  }
```

- [ ] **Step 4: 카드 헤더에 휴지통 버튼 추가**

카드 헤더의 right 버튼 영역(약 line 300)을 찾는다. 현재 코드:
```tsx
                      {isOwner && (
                        <button
                          onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
                          className="rounded-lg p-1.5 text-[#b0b8c1] hover:text-[#4e5968] hover:bg-[#f2f4f6] active:scale-[0.97] transition-all"
                          title="이름 변경"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
```

pencil 버튼 블록 바로 다음(닫는 `}`와 `{!isOwner &&` 사이)에 아래를 삽입한다:

```tsx
                      {isOwner && (
                        <button
                          onClick={() => { setDeleteTarget({ groupId: group.id, groupName: group.name }); setDeleteStep(1); }}
                          className="rounded-lg p-1.5 text-[#b0b8c1] hover:text-[#F04452] hover:bg-[rgba(240,68,82,0.08)] active:scale-[0.97] transition-all"
                          title="장부 삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
```

- [ ] **Step 5: 2개의 ConfirmModal 추가**

파일 끝부분의 `</div>` 닫기 태그 직전(`<ConfirmModal open={leaveTarget !== null} .../>` 다음)에 아래를 추가한다:

```tsx
      <ConfirmModal
        open={deleteTarget !== null && deleteStep === 1}
        title="장부를 삭제할까요?"
        description={
          (() => {
            const count = deleteTarget ? (membersByGroup[deleteTarget.groupId]?.length ?? 0) : 0;
            const prefix = count > 0 ? `멤버가 ${count}명 있습니다. ` : "";
            return `${prefix}이 장부를 삭제하면 모든 스냅샷 데이터와 멤버 정보가 영구 삭제됩니다.`;
          })()
        }
        confirmLabel="계속"
        onConfirm={() => setDeleteStep(2)}
        onCancel={handleDeleteCancel}
      />
      <ConfirmModal
        open={deleteTarget !== null && deleteStep === 2}
        title="정말 삭제할까요?"
        confirmLabel="삭제"
        confirmDisabled={deleteNameInput !== (deleteTarget?.groupName ?? "") || deleteLoading}
        onConfirm={handleDeleteGroup}
        onCancel={handleDeleteCancel}
      >
        <div className="mt-3 space-y-2">
          <p className="text-sm text-[#8b95a1]">
            장부 이름을 입력하면 영구 삭제됩니다.
          </p>
          <input
            type="text"
            value={deleteNameInput}
            onChange={(e) => { setDeleteNameInput(e.target.value); setDeleteError(""); }}
            placeholder={deleteTarget?.groupName}
            className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm focus:outline-none focus:border-[#3182f6]"
            autoFocus
          />
          {deleteError && <p className="text-xs text-[#F04452]">{deleteError}</p>}
        </div>
      </ConfirmModal>
```

- [ ] **Step 6: TypeScript 빌드 확인**

```powershell
cd frontend; npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/app/`(app`)/settings/page.tsx
git commit -m "feat: settings 장부 삭제 플로우 구현 — 2단계 확인 + 이름 입력 검증 (#67)"
```

---

## Task 3: e2e 테스트

**Files:**
- Create: `frontend/e2e/delete-group.spec.ts`

**Interfaces:**
- Consumes: Task 2의 완성된 삭제 UI
- Produces: `frontend/e2e/delete-group.spec.ts` (6개 테스트)

테스트 설계 원칙:
- `TEST_EMAIL` 환경변수 없으면 전체 skip
- groups API mock은 `page.route()` — **반드시 `login()` 호출 전에 설정**
- DELETE API는 `**/api/v1/asset-groups/g1` 패턴으로 mock
- members API는 `**/api/v1/asset-groups/g1/members` 패턴

- [ ] **Step 1: 테스트 파일 작성**

`frontend/e2e/delete-group.spec.ts`를 생성한다:

```ts
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
```

- [ ] **Step 2: e2e 테스트 실행 확인**

dev 서버와 백엔드가 실행 중인 상태에서:
```powershell
cd frontend; $env:TEST_EMAIL="test-history@assetnavigator.test"; $env:TEST_PASSWORD="TestPassword123!"; npx playwright test e2e/delete-group.spec.ts --reporter=line 2>&1
```

Expected: 6개 테스트 중 `TEST_EMAIL` skip 없이 실행, 모두 PASS.  
서버 미실행 시: skip 또는 timeout은 허용. 타입/구문 오류는 허용 안 됨.

- [ ] **Step 3: Commit**

```powershell
git add frontend/e2e/delete-group.spec.ts
git commit -m "test: 장부 삭제 e2e 테스트 추가 (#67)"
```

---

## Self-Review

**Spec coverage 체크:**
- [x] `ConfirmModal` children + confirmDisabled → Task 1
- [x] `deleteGroup` API 함수 → Task 1
- [x] 휴지통 버튼 (owner만) → Task 2 Step 4
- [x] 1단계 ConfirmModal + 멤버 수 조건부 → Task 2 Step 5
- [x] 2단계 이름 입력 + 버튼 활성화 조건 → Task 2 Step 5
- [x] 삭제 후 목록 즉시 제거 + membersByGroup 정리 → Task 2 Step 3
- [x] 활성 장부 삭제 시 전환 (없으면 캐시 초기화) → Task 2 Step 3
- [x] `group-changed` 이벤트 발송 → Task 2 Step 3
- [x] e2e 테스트 → Task 3

**Placeholder scan:** 없음.

**Type consistency:**
- `deleteGroup(groupId: string): Promise<void>` — Task 1에서 정의, Task 2에서 import하여 사용 ✅
- `resetGroupIdCache(): void` — 기존 api.ts export, Task 2에서 import ✅
- `deleteTarget: { groupId: string; groupName: string } | null` — Task 2 step 2에서 정의, step 3·4·5에서 동일 타입 사용 ✅
- `deleteStep: 1 | 2` — Task 2 step 2에서 정의, step 4에서 `setDeleteStep(1)`, step 5에서 `deleteStep === 1`, `deleteStep === 2` 사용 ✅
