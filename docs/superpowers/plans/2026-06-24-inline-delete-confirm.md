# 스냅샷 삭제 인라인 확인 UI 구현 계획 (Issue #37)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `history/page.tsx`의 `window.confirm()` 삭제 확인을 인라인 [삭제] [취소] UI로 교체한다.

**Architecture:** `confirmingId` 상태를 추가해 삭제 아이콘 클릭 시 해당 행에 인라인 확인 버튼을 표시한다. 새 컴포넌트 없이 단일 파일 수정으로 완결된다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Playwright (e2e)

## Global Constraints

- 수정 파일: `frontend/src/app/(app)/history/page.tsx` 단독
- 새 컴포넌트 금지
- 스타일은 기존 색상 변수/클래스만 사용
- 워크트리에서 작업 (CLAUDE.md 정책)

---

## 사전 준비: 워크트리 생성

- [ ] 워크트리 생성

```powershell
git worktree add ../AssetNavigator-issue-37 -b fix/37-inline-delete-confirm
```

- [ ] 이후 모든 작업은 `../AssetNavigator-issue-37/` 경로에서 진행

---

## Task 1: e2e 테스트 업데이트 (TDD — 먼저 실패하는 테스트 작성)

**Files:**
- Modify: `frontend/e2e/snapshot.spec.ts` (기존 삭제 테스트 교체 + 취소 테스트 추가)

**Interfaces:**
- Produces: 인라인 confirm UI의 접근 방법 — `button:text("삭제")` 첫 클릭 → `[data-testid="confirm-delete"]` 버튼 클릭으로 삭제 완료

- [ ] **Step 1: 기존 삭제 테스트를 인라인 UI 방식으로 교체**

`frontend/e2e/snapshot.spec.ts`의 "스냅샷 삭제 → 히스토리에서 제거 확인" 테스트(115~141줄)를 아래로 교체:

```ts
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
```

- [ ] **Step 2: 취소 테스트 추가**

바로 아래에 추가:

```ts
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
```

- [ ] **Step 3: 테스트가 실패하는지 확인** (dev 서버 실행 중이어야 함)

```powershell
cd frontend
npm run test:e2e -- --grep "스냅샷 삭제"
```

예상 결과: `confirm-delete` 요소를 찾지 못해 FAIL (현재는 window.confirm 사용 중)

- [ ] **Step 4: 변경 스테이징**

```powershell
git add frontend/e2e/snapshot.spec.ts
```

---

## Task 2: 인라인 confirm UI 구현

**Files:**
- Modify: `frontend/src/app/(app)/history/page.tsx`

**Interfaces:**
- Consumes: Task 1에서 정의한 `data-testid="confirm-delete"`, `data-testid="confirm-cancel"`
- Produces: 없음 (최종 구현)

- [ ] **Step 1: `confirmingId` 상태 추가**

`history/page.tsx` 29줄 `deletingId` 선언 바로 아래에 추가:

```ts
const [confirmingId, setConfirmingId] = useState<string | null>(null);
```

- [ ] **Step 2: `handleDelete` 함수 분리**

기존 `handleDelete` (46~55줄)를 아래 두 함수로 교체:

```ts
function requestDelete(id: string) {
  setConfirmingId(id);
}

async function confirmDelete(id: string) {
  setConfirmingId(null);
  setDeletingId(id);
  try {
    await deleteSnapshot(id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  } finally {
    setDeletingId(null);
  }
}
```

- [ ] **Step 3: 행 우측 버튼 렌더링 교체**

기존 `<div className="flex items-center gap-2">` 블록(108~125줄)을 아래로 교체:

```tsx
<div className="flex items-center gap-2">
  <Link
    href={`/snapshot/${s.id}`}
    className="flex items-center gap-1.5 rounded-xl bg-[#f2f4f6] px-3 py-1.5 text-xs font-medium text-[#4e5968] hover:bg-[#e8ecf0] transition-colors"
  >
    <Pencil size={13} />
    보기 / 수정
  </Link>

  {confirmingId === s.id ? (
    <>
      <span className="text-xs text-[#4e5968]">정말 삭제할까요?</span>
      <button
        type="button"
        data-testid="confirm-delete"
        disabled={deletingId === s.id}
        onClick={() => confirmDelete(s.id)}
        className="flex items-center gap-1.5 rounded-xl bg-[rgba(240,68,82,0.08)] px-3 py-1.5 text-xs font-medium text-[#f04452] hover:bg-[rgba(240,68,82,0.15)] transition-colors disabled:opacity-50"
      >
        삭제
      </button>
      <button
        type="button"
        data-testid="confirm-cancel"
        onClick={() => setConfirmingId(null)}
        className="flex items-center gap-1.5 rounded-xl bg-[#f2f4f6] px-3 py-1.5 text-xs font-medium text-[#4e5968] hover:bg-[#e8ecf0] transition-colors"
      >
        취소
      </button>
    </>
  ) : (
    <button
      type="button"
      disabled={deletingId === s.id}
      onClick={() => requestDelete(s.id)}
      className="flex items-center gap-1.5 rounded-xl bg-[rgba(240,68,82,0.08)] px-3 py-1.5 text-xs font-medium text-[#f04452] hover:bg-[rgba(240,68,82,0.15)] transition-colors disabled:opacity-50"
    >
      <Trash2 size={13} />
      삭제
    </button>
  )}
</div>
```

- [ ] **Step 4: TypeScript 타입 체크**

```powershell
cd frontend
npx tsc --noEmit
```

예상 결과: 오류 없음

- [ ] **Step 5: e2e 테스트 실행** (dev 서버 실행 중이어야 함)

```powershell
cd frontend
npm run test:e2e -- --grep "스냅샷 삭제"
```

예상 결과: 3개 테스트 모두 PASS

- [ ] **Step 6: Lint 확인**

```powershell
cd frontend
npm run lint
```

예상 결과: 오류 없음

- [ ] **Step 7: 커밋**

```powershell
git add frontend/src/app/(app)/history/page.tsx frontend/e2e/snapshot.spec.ts
git commit -m "fix: 스냅샷 삭제 확인을 window.confirm → 인라인 UI로 교체 (#37)"
```

---

## 완료 후 PR 생성

```powershell
git push -u origin fix/37-inline-delete-confirm
gh pr create --title "fix: 스냅샷 삭제 확인을 인라인 UI로 교체 (#37)" --body "$(cat <<'EOF'
## Summary
- `window.confirm()` 제거, 인라인 [삭제] [취소] 버튼으로 교체
- `confirmingId` 상태로 행별 confirm 표시 관리
- e2e 테스트 업데이트 (dialog 핸들러 → testid 기반)

Closes #37
EOF
)"
```
