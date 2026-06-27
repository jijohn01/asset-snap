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
- **Playwright MCP 주의:** Chromium은 `localhost`를 IPv6(`::1`)로 해석하므로 `.env.local`의 `NEXT_PUBLIC_API_URL`을 `http://127.0.0.1:8000`으로 설정해야 연결됨 (`localhost:8000` 사용 시 `ERR_FAILED`).
- **e2e 테스트:** `TEST_EMAIL` / `TEST_PASSWORD` 환경변수 미설정 시 로그인 필요 테스트가 skip됨. Supabase Admin API로 테스트 계정 생성 가능 (`email_confirm: true` 옵션 필수).

## E2E 테스트 패턴

새 페이지나 기능 구현 시 PR 테스트 플랜의 각 항목을 `e2e/` 에 Playwright 테스트로 추가한다.

### API mock 패턴

```typescript
// 성공 응답
await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) })
);

// 에러 응답 (500 mock으로 백엔드 미실행 시나리오 재현)
await page.route("**/api/v1/asset-groups/g1/snapshots/", (route) =>
  route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "서버 오류" }) })
);
```

- 항상 groups 엔드포인트(`**/api/v1/asset-groups/`)도 함께 mock — `fetchSnapshots()`가 내부적으로 `getDefaultGroupId()`를 호출하기 때문.
- route mock은 `login()` 호출 전에 설정해야 적용됨.
- 다른 페이지로 이동 후에도 같은 page context의 mock은 유지됨.

### 에러/빈 상태 구분 검증 체크리스트

| 시나리오 | 확인 사항 |
|----------|-----------|
| API 500 에러 | 에러 메시지 표시 확인 |
| API 500 에러 | "아직 스냅샷이 없어요." 같은 빈 상태 문구 **미표시** 확인 |
| API 500 에러 | "첫 스냅샷 입력하기" 같은 CTA **미표시** 확인 |
| 데이터 0건 (정상) | 빈 상태 문구 및 CTA 표시 확인 |
| 데이터 있음 | 실제 데이터 렌더링 확인, 빈 상태 문구 미표시 확인 |
