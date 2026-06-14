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

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | 대시보드 — 최신 스냅샷 기준 순자산 카드 + 트렌드 차트 |
| `/history` | 월별 이력 목록 — 스냅샷 보기/수정/삭제 |
| `/snapshot/new` | 새 스냅샷 입력 — 엑셀 스타일 2열 그리드, 직전 스냅샷 금액으로 미리채움 |
| `/snapshot/[id]` | 기존 스냅샷 수정/삭제 |

## Data Model (핵심)

```
SnapshotData:
  assets / liabilities / income / expenses
    └─ subcategory (e.g. "cash_savings")
         └─ item_id → amount (만원 단위 정수)

user_items: 사용자 정의 항목 목록 (category, label, sort_order, memo)
```
