# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. Project Structure

This is a monorepo with two workspaces:
- `frontend/` — Next.js 15 + TypeScript (see `frontend/CLAUDE.md`)
- `backend/` — FastAPI (Python) (see `backend/CLAUDE.md`)

Always scope commands to the correct subdirectory (e.g., `npm ...` from `frontend/`, Python/uvicorn commands from `backend/`).

## Quick Start

```powershell
# 백엔드 + 프론트엔드 동시 실행
.\scripts\dev.ps1
```

- 프론트엔드: http://localhost:3000
- 백엔드: http://localhost:8000 / API 문서: http://localhost:8000/docs

Python 환경 첫 설정: `backend/` 에서 `uv sync`

### 필수 환경변수

`frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

`backend/.env`:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ALLOWED_ORIGINS=["http://localhost:3000"]   # JSON 배열 형식 필수
```

## Testing

```bash
# 백엔드
cd backend && uv run pytest

# 프론트엔드 e2e (dev 서버 실행 중이어야 함)
cd frontend && npm run test:e2e
```

### 브라우저 검증 필수

Playwright `page.route()` mock 테스트 통과 ≠ 완료. UI 기능을 구현했다면 반드시 실제 브라우저와 서버를 띄워서 확인한다.

- 프론트 dev 서버(localhost:3000) + 백엔드를 실제로 실행해 동작 확인
- 백엔드 다운 시나리오가 있으면 실제로 백엔드를 끈 상태에서 확인
- Playwright MCP로 스크린샷 찍어 결과 공유

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/login` | 로그인 (Supabase Auth 이메일+비밀번호) |
| `/signup` | 회원가입 |
| `/` | 대시보드 — 최신 스냅샷 기준 순자산 카드 + 트렌드 차트 |
| `/history` | 월별 이력 목록 — 스냅샷 보기/수정/삭제, 전월 대비 순자산 증감(▲▼) 표시 |
| `/snapshot/new` | 새 스냅샷 입력 — 엑셀 스타일 2열 그리드, 직전 스냅샷 금액으로 미리채움 |
| `/snapshot/[id]` | 기존 스냅샷 수정/삭제 |
| `/settings` | 프로필 닉네임 수정, 장부 관리(생성/이름변경), 멤버 초대/역할변경/제거, 소유권 이전 |

`/login`, `/signup` 외 모든 라우트는 `middleware.ts`가 미인증 시 `/login`으로 리다이렉트.

## Data Model (핵심)

```
SnapshotData:
  assets / liabilities / income / expenses
    └─ subcategory (e.g. "cash_savings")
         └─ item_id → amount (만원 단위 정수)

user_items: 사용자 정의 항목 목록 (category, label, sort_order, memo)
```

## Color System

- `frontend/src/lib/colors.ts` — JS 상수 (recharts 등 JS에서 hex 직접 사용)
- `frontend/src/app/globals.css` — `@theme` 블록: CSS vars → Tailwind utility 자동 생성 (`--color-primary-500` → `bg-primary-500`)
- 토스 팔레트: primary `#3182F6`, positive `#03b26c`, negative `#F04452`

## 6. Worktree Policy

**파일 수정이 포함된 모든 코딩 작업은 반드시 워크트리에서 진행한다.**

### 워크트리 생성

```bash
git worktree add ../AssetNavigator-<slug> -b <branch>
# gitignored 파일 수동 복사 필수
cp backend/.env ../AssetNavigator-<slug>/backend/.env
cp frontend/.env.local ../AssetNavigator-<slug>/frontend/.env.local
```

- 작업은 `../AssetNavigator-<slug>` 경로에서만 진행. 메인 디렉터리(`AssetNavigator/`) 파일을 직접 수정하지 않는다.

### 브랜치 이름 규칙

`{type}/{issue-number}-{short-description}` (이슈 있을 때)
`{type}/{short-description}` (이슈 없을 때)

- **type:** `fix` (버그), `feat` (기능), `chore` (설정/정리), `refactor`, `docs`
- **short-description:** 영문 kebab-case, 3단어 이내
- 예: `fix/3-login-redirect`, `feat/5-csv-export`, `chore/2-worktree-policy`

### 완료 후 정리

```bash
git push -u origin <branch>
gh pr create ...
# PR 머지 후
git pull
git worktree remove ../AssetNavigator-<slug>
git branch -d <branch>
git worktree prune
```

### 예외

- 오타 수정 등 1줄 이하의 문서 변경
- 사용자가 명시적으로 "워크트리 없이" 요청한 경우
