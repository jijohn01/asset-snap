# CLAUDE.md — Frontend

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 — use `clsx` + `tailwind-merge` for conditional classes
- **Auth/DB:** Supabase Auth (`@supabase/supabase-js`, `@supabase/ssr`) — 연동 완료
  - `src/lib/supabase.ts` — `createBrowserClient` 싱글턴
  - `src/middleware.ts` — 미인증 시 `/login` 리다이렉트
  - `src/lib/api.ts` — `authHeader()`가 `supabase.auth.getSession()`으로 Bearer 토큰 주입
- **Charts:** `recharts`
- **Icons:** `lucide-react`
- **설치됐으나 미사용:** `react-hook-form`, `zod`, `date-fns` — 현재 폼은 plain `useState` 사용

## Dev Commands

Run from `frontend/`:
- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run test:e2e` — Playwright e2e tests (`e2e/` dir; dev server must be running)

## Key Components

- `src/lib/colors.ts` — 공유 색상 팔레트. JS 상수(`colors.primary[500]` 등)는 recharts에서 직접 사용, CSS vars(`--color-primary-500`)는 `globals.css @theme`에서 Tailwind utility 클래스로 생성됨.
  - Tailwind v4 패턴: `globals.css`의 `--color-primary-500` → `bg-primary-500`, `text-primary-500` 유틸리티 자동 생성. 새 색상 추가 시 두 파일 모두 수정 필요.
  - 토스 팔레트: primary `#3182F6`, positive `#00B493`, negative `#F04452`

- `src/components/SnapshotForm.tsx` — 새 스냅샷/수정 페이지 공유 컴포넌트. 엑셀 스타일 2열 그리드.
  - `initialAmounts?: Record<string, string>` 로 이전 금액 pre-fill
  - 항목 추가/삭제, 인라인 메모 편집, 실시간 순자산/월잉여금 계산 포함
  - `flattenAmounts()` 헬퍼로 nested snapshot data → `Record<string, string>` 변환 (new, [id] 페이지 각자 구현)

## Conventions

- **Worktree 주의:** `git worktree add` 후 `frontend/`에서 `npm install` 필요 — node_modules는 워크트리 간 공유되지 않음.
- App Router only — no Pages Router.
- `src/` 구조 사용 — 앱 코드는 `frontend/src/` 아래에 위치.
  - `src/app/(app)/` — 사이드바 있는 인증된 페이지 (라우트 그룹)
  - `src/app/login/`, `src/app/signup/` — 사이드바 없는 인증 페이지
  - `src/components/` — 공유 컴포넌트 (예: `layout/Sidebar.tsx`)
- Server Components by default; add `"use client"` only when needed (event handlers, hooks, browser APIs).
- 현재 데이터는 백엔드 FastAPI(`NEXT_PUBLIC_API_URL`)를 통해 호출.
- `frontend/.env.local` 필수 변수 (gitignored):
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000
  NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
  ```
- **Worktree 주의:** `.env.local`은 gitignored라서 워크트리에 자동 복사 안 됨 — 수동 복사 필요.
