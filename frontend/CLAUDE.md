# CLAUDE.md — Frontend

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 — use `clsx` + `tailwind-merge` for conditional classes
- **Auth/DB:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — 아직 미연동 (Phase 2 예정)
- **Charts:** `recharts`
- **Icons:** `lucide-react`
- **설치됐으나 미사용:** `react-hook-form`, `zod`, `date-fns` — 현재 폼은 plain `useState` 사용

## Dev Commands

Run from `frontend/`:
- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint

## Key Components

- `src/components/SnapshotForm.tsx` — 새 스냅샷/수정 페이지 공유 컴포넌트. 엑셀 스타일 2열 그리드.
  - `initialAmounts?: Record<string, string>` 로 이전 금액 pre-fill
  - 항목 추가/삭제, 인라인 메모 편집, 실시간 순자산/월잉여금 계산 포함
  - `flattenAmounts()` 헬퍼로 nested snapshot data → `Record<string, string>` 변환 (new, [id] 페이지 각자 구현)

## Conventions

- App Router only — no Pages Router.
- `src/` 구조 사용 — 앱 코드는 `frontend/src/` 아래에 위치.
  - `src/app/` — 라우트 및 페이지
  - `src/components/` — 공유 컴포넌트 (예: `layout/Sidebar.tsx`)
- Server Components by default; add `"use client"` only when needed (event handlers, hooks, browser APIs).
- 현재 데이터는 백엔드 FastAPI(`NEXT_PUBLIC_API_URL`)를 통해 호출.
- `frontend/.env.local` 에 `NEXT_PUBLIC_API_URL=http://localhost:8000` 필요 (gitignored).
