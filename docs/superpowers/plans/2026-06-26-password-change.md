# 비밀번호 변경 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설정 페이지에 이메일 가입 사용자용 비밀번호 변경 섹션을 추가한다.

**Architecture:** `PasswordChangeSection` 컴포넌트를 `frontend/src/components/settings/`에 분리 생성하고, `settings/page.tsx`에서 Supabase `identities`로 OAuth 여부를 감지해 이메일 사용자에게만 섹션을 조건부 렌더링한다.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase Auth (`@supabase/ssr`), Tailwind CSS v4, Playwright

## Global Constraints

- `frontend/` 디렉토리에서 npm 명령 실행
- `"use client"` 지시어: 이벤트 핸들러/훅 사용 시만 추가
- 기존 스타일 패턴 유지: `rounded-[14px]`, `bg-[rgba(0,23,51,0.02)]`, `border-[rgba(2,32,71,0.05)]`
- 색상 상수: primary `#3182f6`, positive `#03b26c`, negative `#f04452`
- 비밀번호 최소 8자 (Supabase 기본 정책)
- App Router only — Pages Router 사용 금지
- 모든 작업은 워크트리(`../AssetNavigator-issue-63`)에서 진행

---

### Task 1: 워크트리 생성

**Files:** 없음 (환경 설정)

- [ ] **Step 1: 워크트리 생성**

```bash
git worktree add ../AssetNavigator-issue-63 -b feat/63-password-change
```

- [ ] **Step 2: gitignored 파일 복사**

```bash
cp backend/.env ../AssetNavigator-issue-63/backend/.env
cp frontend/.env.local ../AssetNavigator-issue-63/frontend/.env.local
```

- [ ] **Step 3: frontend npm install**

```bash
cd ../AssetNavigator-issue-63/frontend && npm install
```

Expected: node_modules 설치 완료, 오류 없음

---

### Task 2: PasswordChangeSection 컴포넌트 생성

**Files:**
- Create: `frontend/src/components/settings/PasswordChangeSection.tsx`

**Produces:**
- `export default function PasswordChangeSection({ email }: { email: string }): JSX.Element`

- [ ] **Step 1: 파일 생성**

`frontend/src/components/settings/PasswordChangeSection.tsx`:

```tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PasswordChangeSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError("");

    if (newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setError("현재 비밀번호가 올바르지 않습니다");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.signOut({ scope: "others" });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8b95a1] border-b border-[#e5e8eb] pb-2">
        계정 보안
      </h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="w-24 shrink-0 text-sm text-[#6b7684]">현재 비밀번호</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호"
            className="flex-1 max-w-xs rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-24 shrink-0 text-sm text-[#6b7684]">새 비밀번호</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="8자 이상"
            className="flex-1 max-w-xs rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="w-24 shrink-0 text-sm text-[#6b7684]">비밀번호 확인</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="새 비밀번호 재입력"
            className="flex-1 max-w-xs rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
          />
        </div>
        {error && <p className="text-xs text-[#f04452] pl-[108px]">{error}</p>}
        <div className="flex items-center gap-3 pl-[108px]">
          <button
            onClick={handleSubmit}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="rounded-2xl bg-[#3182f6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40 transition-colors"
          >
            {loading ? "변경 중" : "변경"}
          </button>
          {success && (
            <span className="text-xs font-semibold text-[#03b26c]">변경됐습니다</span>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: TypeScript 타입 검사**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/settings/PasswordChangeSection.tsx
git commit -m "feat: PasswordChangeSection 컴포넌트 추가 (#63)"
```

---

### Task 3: settings/page.tsx 수정

**Files:**
- Modify: `frontend/src/app/(app)/settings/page.tsx`

**Consumes:**
- `PasswordChangeSection({ email: string })` — Task 2에서 정의

- [ ] **Step 1: import 추가**

파일 최상단 import 블록에 추가 (기존 import들 아래):

```tsx
import PasswordChangeSection from "@/components/settings/PasswordChangeSection";
```

- [ ] **Step 2: 상태 변수 추가**

기존 `const [currentUserId, setCurrentUserId] = useState<string | null>(null);` 바로 아래에 추가:

```tsx
const [userEmail, setUserEmail] = useState<string | null>(null);
const [hasEmailAuth, setHasEmailAuth] = useState(false);
```

- [ ] **Step 3: init() 함수 내 OAuth 감지 코드 추가**

기존 `init()` 함수의 `if (data.user) {` 블록을 다음으로 교체:

```tsx
if (data.user) {
  setCurrentUserId(data.user.id);
  setUserEmail(data.user.email ?? null);
  const identities = data.user.identities ?? [];
  setHasEmailAuth(identities.some((i) => i.provider === "email"));
  const { data: p } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", data.user.id)
    .single();
  if (p?.display_name) setDisplayName(p.display_name);
}
```

- [ ] **Step 4: JSX에 계정 보안 섹션 삽입**

프로필 `</section>` 닫는 태그 바로 아래, `{/* ── 내 장부 ── */}` 주석 바로 위에 삽입:

```tsx
{hasEmailAuth && userEmail && (
  <PasswordChangeSection email={userEmail} />
)}
```

- [ ] **Step 5: TypeScript 타입 검사**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/(app)/settings/page.tsx
git commit -m "feat: 설정 페이지에 계정 보안 섹션 통합 (#63)"
```

---

### Task 4: e2e 테스트 작성 및 검증

**Files:**
- Create: `frontend/e2e/settings-password.spec.ts`

- [ ] **Step 1: 테스트 파일 작성**

`frontend/e2e/settings-password.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 8000 });
}

test.describe("비밀번호 변경", () => {
  test("이메일 가입 사용자에게 계정 보안 섹션이 표시된다", async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip();
    await login(page);
    await page.goto("/settings");
    await expect(page.locator("text=계정 보안")).toBeVisible();
    await expect(page.getByPlaceholder("현재 비밀번호")).toBeVisible();
    await expect(page.getByPlaceholder("8자 이상")).toBeVisible();
    await expect(page.getByPlaceholder("새 비밀번호 재입력")).toBeVisible();
  });

  test("새 비밀번호가 8자 미만이면 에러 메시지를 표시한다", async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip();
    await login(page);
    await page.goto("/settings");
    await page.fill('input[placeholder="현재 비밀번호"]', "anypassword");
    await page.fill('input[placeholder="8자 이상"]', "short");
    await page.fill('input[placeholder="새 비밀번호 재입력"]', "short");
    await page.click('button:has-text("변경")');
    await expect(page.locator("text=비밀번호는 8자 이상이어야 합니다")).toBeVisible();
  });

  test("새 비밀번호와 확인이 다르면 에러 메시지를 표시한다", async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip();
    await login(page);
    await page.goto("/settings");
    await page.fill('input[placeholder="현재 비밀번호"]', "anypassword");
    await page.fill('input[placeholder="8자 이상"]', "newpassword123");
    await page.fill('input[placeholder="새 비밀번호 재입력"]', "differentpassword");
    await page.click('button:has-text("변경")');
    await expect(page.locator("text=비밀번호가 일치하지 않습니다")).toBeVisible();
  });

  test("현재 비밀번호가 틀리면 에러 메시지를 표시한다", async ({ page }) => {
    if (!EMAIL || !PASSWORD) test.skip();
    await login(page);
    await page.goto("/settings");
    await page.fill('input[placeholder="현재 비밀번호"]', "definitelywrongpassword999");
    await page.fill('input[placeholder="8자 이상"]', "newpassword123");
    await page.fill('input[placeholder="새 비밀번호 재입력"]', "newpassword123");
    await page.click('button:has-text("변경")');
    await expect(page.locator("text=현재 비밀번호가 올바르지 않습니다")).toBeVisible({ timeout: 8000 });
  });
});
```

- [ ] **Step 2: dev 서버 실행 (별도 터미널)**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: e2e 테스트 실행**

```bash
cd frontend && TEST_EMAIL=<이메일> TEST_PASSWORD=<비밀번호> npm run test:e2e -- e2e/settings-password.spec.ts
```

Expected: 4개 테스트 PASS (TEST_EMAIL/TEST_PASSWORD 미설정 시 4개 모두 skipped)

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/settings-password.spec.ts
git commit -m "test: 비밀번호 변경 e2e 테스트 추가 (#63)"
```

---

### Task 5: PR 생성 및 워크트리 정리

- [ ] **Step 1: 브랜치 push**

```bash
git push -u origin feat/63-password-change
```

- [ ] **Step 2: PR 생성**

```bash
gh pr create \
  --title "feat: 비밀번호 변경 기능 추가 (#63)" \
  --body "$(cat <<'EOF'
## Summary
- 설정 페이지에 **계정 보안** 섹션 추가
- 이메일/비밀번호 가입 사용자만 표시 (Supabase `identities`로 OAuth 사용자 자동 제외)
- 현재 비밀번호 검증(`signInWithPassword`) 후 변경, 성공 시 다른 세션 자동 로그아웃(`signOut({ scope: 'others' })`)
- `PasswordChangeSection` 컴포넌트를 `components/settings/`에 분리

## Test plan
- [ ] 이메일 계정 로그인 → 설정 페이지 → 계정 보안 섹션 표시 확인
- [ ] 새 비밀번호 7자 입력 → "비밀번호는 8자 이상이어야 합니다" 에러 표시 확인
- [ ] 새 비밀번호/확인 불일치 → "비밀번호가 일치하지 않습니다" 에러 표시 확인
- [ ] 현재 비밀번호 오입력 → "현재 비밀번호가 올바르지 않습니다" 에러 표시 확인
- [ ] 올바른 비밀번호로 변경 성공 → "변경됐습니다" 메시지 표시 확인
- [ ] Playwright: `TEST_EMAIL=x TEST_PASSWORD=x npm run test:e2e -- e2e/settings-password.spec.ts`

Closes #63
EOF
)"
```

- [ ] **Step 3: PR 머지 후 워크트리 정리** (PR 머지 후 메인 디렉토리에서 실행)

```bash
git pull
git worktree remove ../AssetNavigator-issue-63
git branch -d feat/63-password-change
git worktree prune
```
