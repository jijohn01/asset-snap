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
- No `src/` wrapper; app code lives directly in `frontend/app/`.
- Server Components by default; add `"use client"` only when needed (event handlers, hooks, browser APIs).
- Supabase SSR client for server components/actions, browser client for client components.
