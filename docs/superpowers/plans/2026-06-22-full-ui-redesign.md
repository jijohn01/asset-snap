# Full UI Redesign — Toss Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전체 앱 UI를 Toss 디자인 시스템(DESIGN.md)으로 재디자인한다. 기능 변경 없음.

**Architecture:** 사이드바를 상단 네비게이션 바(Topbar)로 교체하고, DESIGN.md의 정확한 색상 토큰·카드 스타일·타이포그래피를 전 페이지에 적용한다. 로직(API 호출, 상태 관리, 인증)은 일절 건드리지 않는다.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, lucide-react

**Worktree:** `C:\Users\Jisoo\Projects\AssetNavigator-design-group`  
**Branch:** `feat/design-group-ux`

## Global Constraints

- 모든 명령은 `frontend/` 디렉토리에서 실행
- 색상은 TDS 정확값 사용 (아래 토큰 테이블 참조)
- 이모지 UI 사용 금지 — lucide-react 아이콘으로 대체
- 로직·API·라우팅 변경 없음
- 카드 스타일: `border border-[#E4E4E7]` → `shadow-[0_2px_8px_rgba(0,0,0,0.08)]` (no border)
- 입력 필드: TDS box 스타일 — `bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] rounded-[14px]`
- 기본 버튼(primary): `bg-[#3182f6] hover:bg-[#2272eb] rounded-2xl font-semibold`

### 색상 토큰 (TDS 정확값)

| 역할 | 현재 | TDS 정확값 |
|---|---|---|
| 잉크(제목) | `#111111` | `#191f28` |
| 잉크 서브 | `#6B6B6B` | `#6b7684` |
| 캡션 | `#9B9B9B` | `#8b95a1` |
| 플레이스홀더 | `#BBBBBB` | `#b0b8c1` |
| 표면 배경 | `#F5F5F7` | `#f2f4f6` |
| 보더 | `#E4E4E7` | `#e5e8eb` |
| 카드 bg | `#fff` | `#fff` |
| 긍정 | `#00B493` | `#03b26c` |
| 부정 | `#F04452` | `#f04452` (동일) |
| Primary | `#3182F6` | `#3182f6` (동일) |
| Primary hover | `#1B6EF3` | `#2272eb` |

---

## 파일 구조 (변경 대상)

| 파일 | 작업 |
|---|---|
| `frontend/src/app/globals.css` | 수정 — 토큰 값 업데이트 |
| `frontend/src/components/layout/Topbar.tsx` | **신규** — 상단 바 + 그룹 전환기 |
| `frontend/src/components/layout/Sidebar.tsx` | **삭제** |
| `frontend/src/app/(app)/layout.tsx` | 수정 — Sidebar → Topbar, 컨테이너 max-w-5xl |
| `frontend/src/app/(app)/page.tsx` | 수정 — 카드 shadow, 색상 토큰 |
| `frontend/src/app/(app)/history/page.tsx` | 수정 — 카드 shadow, 색상 토큰 |
| `frontend/src/components/SnapshotForm.tsx` | 수정 — 색상 토큰, 버튼 스타일 |
| `frontend/src/app/login/page.tsx` | 수정 — 카드 shadow, TDS 입력/버튼 |
| `frontend/src/app/signup/page.tsx` | 수정 — 카드 shadow, TDS 입력/버튼 |

---

## Task 1: 디자인 토큰 업데이트 (globals.css)

**Files:**
- Modify: `frontend/src/app/globals.css`

**Interfaces:**
- Produces: Tailwind utility 클래스 `bg-surface`, `text-ink`, `border-border`, `text-positive` 등이 TDS 정확값을 사용

- [ ] **Step 1: globals.css `@theme` 블록 전체 교체**

`frontend/src/app/globals.css`를 아래 내용으로 교체한다 (import 라인은 그대로 유지):

```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css");
@import "tailwindcss";

@theme {
  --color-primary-50: #e8f3ff;
  --color-primary-300: #93c5fd;
  --color-primary-500: #3182f6;
  --color-primary-600: #2272eb;
  --color-primary-700: #1559c7;
  --color-positive: #03b26c;
  --color-negative: #f04452;
  --color-surface: #f2f4f6;
  --color-border: #e5e8eb;
  --color-ink: #191f28;
  --color-ink-sub: #6b7684;
  --font-sans: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

@layer base {
  body {
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-variant-numeric: tabular-nums;
    background-color: #f2f4f6;
  }
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npm run build 2>&1 | grep -E "(error|warning|Compiled)" | head -20
```

Expected: `✓ Compiled successfully` (Supabase env 오류는 무시 — .env.local 없는 워크트리에서 정상)

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/app/globals.css
git commit -m "style: TDS 정확 색상 토큰으로 globals.css 업데이트"
```

---

## Task 2: Topbar 컴포넌트 신규 작성

**Files:**
- Create: `frontend/src/components/layout/Topbar.tsx`

**Interfaces:**
- Consumes: `fetchGroups`, `setActiveGroupId`, `resetGroupIdCache` from `@/lib/api`; `supabase` from `@/lib/supabase`
- Produces: `export default function Topbar()` — `<header>` 엘리먼트 반환. 그룹 전환 시 `window.dispatchEvent(new Event("group-changed"))` 발행.

- [ ] **Step 1: Topbar.tsx 생성**

`frontend/src/components/layout/Topbar.tsx` 를 아래 내용으로 생성:

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronDown, User, Users, Plus } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchGroups, resetGroupIdCache, setActiveGroupId, type Group } from "@/lib/api";

const NAV = [
  { href: "/", label: "대시보드" },
  { href: "/history", label: "월별 이력" },
  { href: "/settings", label: "설정" },
] as const;

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups()
      .then((gs) => {
        setGroups(gs);
        const savedId =
          typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
        const current =
          (savedId && gs.find((g) => g.id === savedId)) ||
          gs.find((g) => g.type === "personal") ||
          gs[0];
        if (current) setActiveGroup(current);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleSelectGroup(group: Group) {
    setActiveGroup(group);
    setActiveGroupId(group.id);
    setOpen(false);
    window.dispatchEvent(new Event("group-changed"));
  }

  async function handleLogout() {
    resetGroupIdCache();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-[#e5e8eb] bg-white px-6 gap-4">
      {/* 로고 */}
      <Link
        href="/"
        className="text-base font-semibold text-[#191f28] hover:opacity-75 transition-opacity shrink-0"
      >
        Asset Snap
      </Link>

      {/* 그룹 전환기 */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-[#f2f4f6] px-3 py-1.5 text-sm font-medium text-[#333d4b] hover:bg-[#e8ecf0] transition-colors"
        >
          {activeGroup?.type === "group" ? (
            <Users size={13} className="shrink-0 text-[#8b95a1]" />
          ) : (
            <User size={13} className="shrink-0 text-[#8b95a1]" />
          )}
          <span className="max-w-[120px] truncate">{activeGroup?.name ?? "장부 선택"}</span>
          <ChevronDown
            size={13}
            className={clsx(
              "shrink-0 text-[#8b95a1] transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1.5 min-w-[180px] rounded-xl border border-[#e5e8eb] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)] overflow-hidden">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => handleSelectGroup(g)}
                className={clsx(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors",
                  g.id === activeGroup?.id
                    ? "bg-[rgba(100,168,255,0.1)] text-[#2272eb] font-medium"
                    : "text-[#333d4b] hover:bg-[#f2f4f6]"
                )}
              >
                {g.type === "group" ? (
                  <Users size={13} className="shrink-0" />
                ) : (
                  <User size={13} className="shrink-0" />
                )}
                <span className="truncate flex-1">{g.name}</span>
                {g.id === activeGroup?.id && (
                  <span className="text-[#3182f6] text-xs ml-auto">✓</span>
                )}
              </button>
            ))}
            <div className="border-t border-[#e5e8eb]">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/settings");
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#3182f6] hover:bg-[rgba(100,168,255,0.05)] transition-colors"
              >
                <Plus size={13} className="shrink-0" />
                새 장부 만들기
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <nav className="ml-auto flex items-center gap-0.5">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "text-[#3182f6]"
                : "text-[#8b95a1] hover:text-[#333d4b] hover:bg-[#f2f4f6]"
            )}
          >
            {label}
          </Link>
        ))}
        <div className="mx-2 h-4 w-px bg-[#e5e8eb]" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[#8b95a1] hover:text-[#333d4b] hover:bg-[#f2f4f6] transition-colors"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npm run build 2>&1 | grep -E "(error TS|Type error|Compiled)" | head -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/layout/Topbar.tsx
git commit -m "feat: Topbar 컴포넌트 신규 작성 (그룹 전환기 포함)"
```

---

## Task 3: 레이아웃 교체 (Sidebar → Topbar)

**Files:**
- Modify: `frontend/src/app/(app)/layout.tsx`
- Delete: `frontend/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `Topbar` from `@/components/layout/Topbar`
- Produces: 앱 레이아웃이 `<Topbar /> + <main max-w-5xl>` 구조로 변경됨

- [ ] **Step 1: layout.tsx 전체 교체**

`frontend/src/app/(app)/layout.tsx` 를 아래 내용으로 교체:

```tsx
import Topbar from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f2f4f6]">
      <Topbar />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar.tsx 삭제**

```bash
rm frontend/src/components/layout/Sidebar.tsx
```

- [ ] **Step 3: 빌드 확인**

```bash
cd frontend && npm run build 2>&1 | grep -E "(error TS|Type error|Compiled)" | head -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/app/\(app\)/layout.tsx
git rm frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: 사이드바 → 상단 Topbar로 레이아웃 교체"
```

---

## Task 4: 대시보드 카드 스타일 업데이트

**Files:**
- Modify: `frontend/src/app/(app)/page.tsx`

**Interfaces:**
- Consumes: 변경 없음 (로직 그대로)
- Produces: 대시보드 카드들이 border 없이 shadow 기반으로 렌더링됨

현재 파일의 변경 포인트 (이미 이 브랜치에서 일부 적용됨):

- [ ] **Step 1: 순자산 히어로 카드 border → shadow**

`frontend/src/app/(app)/page.tsx` 에서 아래 내용을 찾아 교체:

찾기:
```tsx
      <div className="mt-6 rounded-xl border border-[#E4E4E7] bg-white px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#6B6B6B]">순자산</p>
```

교체:
```tsx
      <div className="mt-6 rounded-xl bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <p className="text-xs font-medium uppercase tracking-wider text-[#8b95a1]">순자산</p>
```

- [ ] **Step 2: 순자산 히어로 숫자 크기 TDS display-hero로 업그레이드**

찾기:
```tsx
            <p className="mt-1 text-5xl font-bold text-[#111111]">{heroCard!.display}</p>
```

교체:
```tsx
            <p className="mt-1 text-[30px] font-bold text-[#191f28] tabular-nums">{heroCard!.display}</p>
```

찾기:
```tsx
          <p className="mt-1 text-5xl font-bold text-[#D0D0D0]">{loading ? "..." : "—"}</p>
```

교체:
```tsx
          <p className="mt-1 text-[30px] font-bold text-[#e5e8eb]">{loading ? "..." : "—"}</p>
```

- [ ] **Step 3: 보조 지표 3개 카드 border → shadow + 색상 업데이트**

찾기:
```tsx
              <div key={label} className="rounded-xl border border-[#E4E4E7] bg-white p-4">
                <p className="text-xs font-medium text-[#6B6B6B]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#D0D0D0]">{loading ? "..." : "—"}</p>
```

교체:
```tsx
              <div key={label} className="rounded-xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                <p className="text-xs font-medium text-[#8b95a1]">{label}</p>
                <p className="mt-2 text-[22px] font-bold text-[#e5e8eb]">{loading ? "..." : "—"}</p>
```

찾기:
```tsx
                <div key={label} className="rounded-xl border border-[#E4E4E7] bg-white p-4">
                  <p className="text-xs font-medium text-[#6B6B6B]">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[#111111]">{display}</p>
```

교체:
```tsx
                <div key={label} className="rounded-xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                  <p className="text-xs font-medium text-[#8b95a1]">{label}</p>
                  <p className="mt-2 text-[22px] font-bold text-[#191f28] tabular-nums">{display}</p>
```

- [ ] **Step 4: 차트 카드 border → shadow + 헤딩 색상**

찾기:
```tsx
        <div className="col-span-2 rounded-xl border border-[#E4E4E7] bg-white p-5">
          <p className="text-sm font-medium text-[#6B6B6B]">월별 순자산 구성</p>
```

교체:
```tsx
        <div className="col-span-2 rounded-xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-semibold text-[#333d4b]">월별 순자산 구성</p>
```

찾기:
```tsx
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-5">
          <p className="text-sm font-medium text-[#6B6B6B]">자산 구성</p>
```

교체:
```tsx
        <div className="rounded-xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <p className="text-sm font-semibold text-[#333d4b]">자산 구성</p>
```

- [ ] **Step 5: 페이지 헤딩 색상 (이미 이 브랜치에서 변경됨 — 확인만)**

`text-[#191f28]` 과 `text-[#8b95a1]` 이 이미 사용되고 있는지 확인. 아직 이전 값 (`#111111`, `#6B6B6B`) 이 있으면 교체.

- [ ] **Step 6: 빌드 + 커밋**

```bash
cd frontend && npm run build 2>&1 | grep -E "(error TS|Compiled)" | head -10
git add frontend/src/app/\(app\)/page.tsx
git commit -m "style: 대시보드 카드 shadow 적용 및 TDS 색상 토큰 적용"
```

---

## Task 5: 월별 이력 페이지 스타일 업데이트

**Files:**
- Modify: `frontend/src/app/(app)/history/page.tsx`

**Interfaces:**
- Consumes: 변경 없음
- Produces: 이력 카드가 border 없이 shadow, TDS 색상 적용됨

- [ ] **Step 1: 페이지 헤딩 색상 업데이트**

`frontend/src/app/(app)/history/page.tsx` 에서:

찾기:
```tsx
          <h2 className="text-2xl font-bold text-[#111111]">월별 이력</h2>
          <p className="mt-1 text-sm text-[#6B6B6B]">스냅샷 타임라인</p>
```

교체:
```tsx
          <h2 className="text-2xl font-bold text-[#191f28]">월별 이력</h2>
          <p className="mt-1 text-sm text-[#8b95a1]">스냅샷 타임라인</p>
```

- [ ] **Step 2: 새 스냅샷 버튼 TDS 스타일**

찾기:
```tsx
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
```

교체:
```tsx
          className="rounded-xl bg-[#3182f6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2272eb] transition-colors"
```

- [ ] **Step 3: 빈 상태 카드 border → shadow**

찾기:
```tsx
          <div className="rounded-xl border border-[#E4E4E7] bg-white p-8 text-center">
            <p className="text-sm text-[#9B9B9B]">스냅샷이 없습니다.</p>
```

교체:
```tsx
          <div className="rounded-xl bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-[#8b95a1]">아직 스냅샷이 없어요.</p>
```

- [ ] **Step 4: 이력 행 카드 border → shadow + 색상 업데이트**

찾기:
```tsx
              className="flex items-center justify-between rounded-xl border border-[#E4E4E7] bg-white p-5 transition-colors hover:bg-[#FAFAFA]"
```

교체:
```tsx
              className="flex items-center justify-between rounded-xl bg-white p-5 transition-colors hover:bg-[#f9fafb] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
```

- [ ] **Step 5: 행 내 텍스트 색상 업데이트**

찾기:
```tsx
                <p className="text-sm font-semibold text-[#111111]">{fmtMonth(s.snapshot_month)}</p>
                <div className="mt-1 flex gap-4 text-xs text-[#9B9B9B]">
```

교체:
```tsx
                <p className="text-sm font-semibold text-[#191f28]">{fmtMonth(s.snapshot_month)}</p>
                <div className="mt-1 flex gap-4 text-xs text-[#8b95a1]">
```

- [ ] **Step 6: 보기/수정 버튼 TDS Weak 스타일**

찾기:
```tsx
                  className="flex items-center gap-1.5 rounded-lg border border-[#E4E4E7] px-3 py-1.5 text-xs text-[#6B6B6B] hover:bg-[#F5F5F7]"
```

교체:
```tsx
                  className="flex items-center gap-1.5 rounded-xl bg-[#f2f4f6] px-3 py-1.5 text-xs font-medium text-[#4e5968] hover:bg-[#e8ecf0] transition-colors"
```

- [ ] **Step 7: 삭제 버튼 TDS Weak/Danger 스타일**

찾기:
```tsx
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
```

교체:
```tsx
                  className="flex items-center gap-1.5 rounded-xl bg-[rgba(240,68,82,0.08)] px-3 py-1.5 text-xs font-medium text-[#f04452] hover:bg-[rgba(240,68,82,0.15)] transition-colors disabled:opacity-50"
```

- [ ] **Step 8: 증감 배지 색상 — positive 토큰 업데이트 확인**

`colors.ts`에서 `positive`가 `#00B493`으로 남아있으면 `#03b26c`로 변경:

찾기 (`frontend/src/lib/colors.ts`):
```ts
  positive: "#00B493",
```

교체:
```ts
  positive: "#03b26c",
```

- [ ] **Step 9: 빌드 + 커밋**

```bash
cd frontend && npm run build 2>&1 | grep -E "(error TS|Compiled)" | head -10
git add frontend/src/app/\(app\)/history/page.tsx frontend/src/lib/colors.ts
git commit -m "style: 이력 페이지 TDS 스타일 적용"
```

---

## Task 6: SnapshotForm 스타일 업데이트

**Files:**
- Modify: `frontend/src/components/SnapshotForm.tsx`

**Interfaces:**
- Consumes: 변경 없음 (props, 로직 그대로)
- Produces: 섹션 헤더·행·입력·버튼이 TDS 색상으로 업데이트됨

- [ ] **Step 1: SECTION_COLORS 상수 업데이트**

찾기:
```tsx
const SECTION_COLORS: Record<string, { header: string; headerText: string; sub: string; subText: string }> = {
  assets:      { header: "bg-[#111111]", headerText: "text-white", sub: "bg-[#F5F5F7]", subText: "text-[#6B6B6B]" },
  liabilities: { header: "bg-[#111111]", headerText: "text-white", sub: "bg-[#F5F5F7]", subText: "text-[#6B6B6B]" },
  income:      { header: "bg-[#111111]", headerText: "text-white", sub: "bg-[#F5F5F7]", subText: "text-[#6B6B6B]" },
  expenses:    { header: "bg-[#111111]", headerText: "text-white", sub: "bg-[#F5F5F7]", subText: "text-[#6B6B6B]" },
};
```

교체:
```tsx
const SECTION_COLORS: Record<string, { header: string; headerText: string; sub: string; subText: string }> = {
  assets:      { header: "bg-[#191f28]", headerText: "text-white", sub: "bg-[#f2f4f6]", subText: "text-[#6b7684]" },
  liabilities: { header: "bg-[#191f28]", headerText: "text-white", sub: "bg-[#f2f4f6]", subText: "text-[#6b7684]" },
  income:      { header: "bg-[#191f28]", headerText: "text-white", sub: "bg-[#f2f4f6]", subText: "text-[#6b7684]" },
  expenses:    { header: "bg-[#191f28]", headerText: "text-white", sub: "bg-[#f2f4f6]", subText: "text-[#6b7684]" },
};
```

- [ ] **Step 2: 섹션 테두리 색상 업데이트**

파일 내 `border-[#E4E4E7]`를 전부 `border-[#e5e8eb]`로 교체 (replace_all):

해당 문자열이 SnapshotForm 내에서 여러 곳 사용됨. 파일 전체에서 `#E4E4E7` → `#e5e8eb` 로 치환.

- [ ] **Step 3: 짝수/홀수 행 배경 업데이트**

찾기:
```tsx
                  className={`flex items-center border-x border-b border-[#e5e8eb] ${idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"} ${dragOverItemId === itemId && dragItemId !== itemId ? "border-t-2 border-t-primary-400" : ""}`}
```

교체:
```tsx
                  className={`flex items-center border-x border-b border-[#e5e8eb] ${idx % 2 === 0 ? "bg-white" : "bg-[#f2f4f6]"} ${dragOverItemId === itemId && dragItemId !== itemId ? "border-t-2 border-t-primary-400" : ""}`}
```

- [ ] **Step 4: 기준 월 입력 TDS 스타일**

찾기:
```tsx
          className="rounded-lg border border-[#E4E4E7] px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
```

교체:
```tsx
          className="rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-3 py-1.5 text-sm text-[#333d4b] focus:border-[#3182f6] focus:outline-none transition-colors"
```

- [ ] **Step 5: 순자산·월잉여금 요약 행 스타일**

찾기 (2곳 모두):
```tsx
          className="flex items-center justify-between rounded border border-[#E4E4E7] bg-[#F5F5F7] px-3 py-2.5 text-sm font-semibold"
```

교체 (2곳 모두):
```tsx
          className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
```

찾기:
```tsx
            <span className="text-[#6B6B6B]">순자산</span>
```

교체:
```tsx
            <span className="text-[#8b95a1]">순자산</span>
```

찾기:
```tsx
            <span className="text-[#6B6B6B]">월잉여금</span>
```

교체:
```tsx
            <span className="text-[#8b95a1]">월잉여금</span>
```

- [ ] **Step 6: 저장 버튼 TDS primary 스타일**

찾기:
```tsx
          className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
```

교체:
```tsx
          className="rounded-2xl bg-[#3182f6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40 transition-colors"
```

- [ ] **Step 7: 삭제 버튼 TDS Weak/Danger 스타일**

찾기:
```tsx
          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50"
```

교체:
```tsx
          className="rounded-2xl bg-[rgba(240,68,82,0.08)] px-4 py-2.5 text-sm font-semibold text-[#f04452] hover:bg-[rgba(240,68,82,0.15)] disabled:opacity-40 transition-colors"
```

- [ ] **Step 8: 항목 추가 인라인 폼 배경**

찾기:
```tsx
                <div className="flex items-center gap-2 border-x border-b border-[#e5e8eb] bg-[#F5F5F7] px-3 py-1.5">
```

교체:
```tsx
                <div className="flex items-center gap-2 border-x border-b border-[#e5e8eb] bg-[#f2f4f6] px-3 py-1.5">
```

- [ ] **Step 9: 빌드 + 커밋**

```bash
cd frontend && npm run build 2>&1 | grep -E "(error TS|Compiled)" | head -10
git add frontend/src/components/SnapshotForm.tsx
git commit -m "style: SnapshotForm TDS 색상 및 버튼 스타일 적용"
```

---

## Task 7: 로그인 / 회원가입 페이지 TDS 스타일

**Files:**
- Modify: `frontend/src/app/login/page.tsx`
- Modify: `frontend/src/app/signup/page.tsx`

**Interfaces:**
- Consumes: 변경 없음 (Supabase auth 로직 그대로)
- Produces: 로그인·회원가입 페이지가 TDS 미니멀 센터드 디자인으로 렌더링됨

### 7-A: 로그인 페이지

- [ ] **Step 1: login/page.tsx 전체 교체 (JSX 부분만)**

`frontend/src/app/login/page.tsx` 의 `return (...)` 블록을 아래로 교체 (로직은 그대로):

```tsx
  return (
    <div className="min-h-screen bg-[#f2f4f6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 앱 아이덴티티 */}
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-bold text-[#191f28] tracking-tight">Asset Snap</h1>
          <p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h2 className="text-lg font-bold text-[#191f28] mb-6">로그인</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#333d4b] mb-2">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@email.com"
                className="w-full rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#333d4b] mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-[#f04452]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#3182f6] py-3 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40 transition-colors mt-2"
            >
              {loading ? "로그인 중" : "로그인"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#8b95a1]">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-[#3182f6] font-semibold hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
```

### 7-B: 회원가입 페이지

- [ ] **Step 2: signup/page.tsx 전체 교체 (JSX 부분만)**

`frontend/src/app/signup/page.tsx` 의 `return (...)` 블록을 아래로 교체 (로직은 그대로):

```tsx
  return (
    <div className="min-h-screen bg-[#f2f4f6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 앱 아이덴티티 */}
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-bold text-[#191f28] tracking-tight">Asset Snap</h1>
          <p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h2 className="text-lg font-bold text-[#191f28] mb-6">회원가입</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "닉네임", type: "text", value: nickname, onChange: setNickname, autoComplete: "nickname", placeholder: "홍길동" },
              { label: "이메일", type: "email", value: email, onChange: setEmail, autoComplete: "email", placeholder: "name@email.com" },
              { label: "비밀번호", type: "password", value: password, onChange: setPassword, autoComplete: "new-password", placeholder: "6자 이상" },
              { label: "비밀번호 확인", type: "password", value: confirmPassword, onChange: setConfirmPassword, autoComplete: "new-password", placeholder: "비밀번호 재입력" },
            ].map(({ label, type, value, onChange, autoComplete, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-[#333d4b] mb-2">{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  className="w-full rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#3182f6] transition-colors"
                />
              </div>
            ))}

            {error && (
              <p className="text-sm text-[#f04452]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#3182f6] py-3 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40 transition-colors mt-2"
            >
              {loading ? "처리 중" : "가입하기"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#8b95a1]">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-[#3182f6] font-semibold hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 3: 빌드 확인**

```bash
cd frontend && npm run build 2>&1 | grep -E "(error TS|Compiled)" | head -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/app/login/page.tsx frontend/src/app/signup/page.tsx
git commit -m "style: 로그인·회원가입 TDS 미니멀 센터드 디자인 적용"
```

---

## Task 8: 최종 통합 검증 및 PR

**Files:**
- No new files

- [ ] **Step 1: 전체 빌드 최종 확인**

```bash
cd frontend && npm run build 2>&1 | grep -E "(error|warning TS|Compiled|Failed)" | head -30
```

Expected: `✓ Compiled successfully`

- [ ] **Step 2: .env.local 복사 후 dev server 실행 (선택)**

워크트리에 `.env.local` 이 없으면 메인 워크트리에서 복사:

```bash
cp /c/Users/Jisoo/Projects/AssetNavigator/frontend/.env.local /c/Users/Jisoo/Projects/AssetNavigator-design-group/frontend/.env.local
```

그 후 dev server 실행:

```bash
cd /c/Users/Jisoo/Projects/AssetNavigator-design-group/frontend && npm run dev
```

브라우저에서 http://localhost:3000 접속 후 다음 확인:
- [ ] 상단 바가 보이고 사이드바가 없음
- [ ] 그룹 전환 드롭다운 동작
- [ ] 대시보드 카드들이 shadow 기반으로 렌더링
- [ ] 이력 페이지 카드 스타일
- [ ] 로그인 페이지 미니멀 카드

- [ ] **Step 3: PR 생성**

```bash
cd /c/Users/Jisoo/Projects/AssetNavigator-design-group
git push -u origin feat/design-group-ux
gh pr create \
  --title "feat: Toss 디자인 시스템 기반 전체 UI 재디자인" \
  --body "$(cat <<'EOF'
## Summary

- 사이드바 제거 → 상단 네비게이션 바(Topbar)로 교체
- DESIGN.md(Toss 디자인 시스템) 정확 색상 토큰 전 페이지 적용
- 카드 스타일: border → shadow 기반으로 전환
- TDS 타이포그래피 스케일 적용 (display-hero 30px, heading 22px)
- 로그인/회원가입: 미니멀 센터드 카드 디자인
- 이력 페이지: TDS Weak 버튼, shadow 행 카드
- SnapshotForm: TDS 입력 박스, primary/danger 버튼

## 기능 변경 없음

모든 API 호출, 상태 관리, 인증, 라우팅은 그대로입니다.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
