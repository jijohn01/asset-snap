# CLAUDE.md — Frontend

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 — use `clsx` + `tailwind-merge` for conditional classes
- **Auth/DB:** Supabase (`@supabase/supabase-js`, `@supabase/ssr` for server-side)
- **Forms:** `react-hook-form` + `zod` for validation via `@hookform/resolvers`
- **Charts:** `recharts`
- **Icons:** `lucide-react`
- **Dates:** `date-fns`

## Dev Commands

Run from `frontend/`:
- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint

## Conventions

- App Router only — no Pages Router.
- `src/` 구조 사용 — 앱 코드는 `frontend/src/` 아래에 위치.
  - `src/app/` — 라우트 및 페이지
  - `src/components/` — 공유 컴포넌트 (예: `layout/Sidebar.tsx`)
- Server Components by default; add `"use client"` only when needed (event handlers, hooks, browser APIs).
- Supabase: 아직 미연동 (Phase 2 예정) — 현재 데이터는 백엔드 FastAPI(`NEXT_PUBLIC_API_URL`)를 통해 호출.
- `frontend/.env.local` 에 `NEXT_PUBLIC_API_URL=http://localhost:8000` 필요 (gitignored).
