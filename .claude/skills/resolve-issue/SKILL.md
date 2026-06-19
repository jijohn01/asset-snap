---
name: resolve-issue
description: GitHub 이슈를 선택해 워크트리에서 수정하고 PR을 생성한다. "이슈 해결", "이슈 수정", "resolve issue", "fix issue"라는 요청에 자동 로드.
---

# resolve-issue

GitHub 이슈를 선택 → 구현 계획 논의 → 워크트리에서 수정 → 서버 확인 → PR 생성 순서로 진행한다.

## Step 1 — 이슈 목록 나열

```bash
gh issue list --limit 30
```

위 명령으로 열린 이슈를 나열하고, AskUserQuestion으로 어떤 이슈를 해결할지 묻는다.
- 이슈 번호, 제목을 간결하게 보여준다.
- 이슈가 없으면 사용자에게 알리고 종료.

## Step 2 — 이슈 상세 파악

```bash
gh issue view <번호> --comments
```

이슈 본문과 댓글을 읽어 요구사항을 파악한다. 관련 코드도 탐색한다.

## Step 3 — 구현 계획 논의

- 구현 방법을 사용자에게 설명한다 (어떤 파일을 어떻게 수정할지).
- AskUserQuestion으로 계획대로 진행할지 확인한다. "수정 필요" 답변이 오면 계획을 조정한 후 다시 확인.
- 승인받기 전까지 코드를 수정하지 않는다.

## Step 4 — 워크트리 생성, Baseline 검증, 수정

브랜치 이름 규칙: `{type}/{issue-number}-{short-description}`
- type: `fix` (버그), `feat` (기능), `chore` (설정/정리), `refactor` (리팩터)
- short-description: 영문 kebab-case, 핵심 단어만 (3단어 이내)
- 예: `fix/42-history-net-worth-diff`, `feat/15-export-csv`

브랜치명을 결정한 뒤 **`superpowers:using-git-worktrees` 스킬을 호출**하여 워크트리를 생성한다.
- 해당 스킬이 `EnterWorktree` 네이티브 툴 → `git worktree add` 폴백 순서로 처리한다.
- 스킬의 Project Setup 단계에서 이 프로젝트는 다음을 실행한다:
  - `frontend/`에서 `npm install`
  - `backend/`에서 `uv sync`
  - `.env`, `.env.local` 파일은 gitignored라 수동 복사 필요 (백엔드/프론트 각각)

**Baseline 테스트 — 구현 시작 전 반드시 통과 확인:**

```bash
# Backend (서버 불필요)
cd backend && uv run pytest -v

# Frontend (TypeScript 오류 검출)
cd frontend && npm run build
```

양쪽 모두 통과한 상태에서 구현을 시작한다. 실패 시 사용자에게 보고 후 진행 여부 확인.

수정 완료 후 커밋한다:

```bash
git add <수정된 파일들>
git commit -m "<type>: <한 줄 요약>

Closes #<이슈번호>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

## Step 5 — 서버 확인 및 Playwright e2e

서버가 아직 안 떠 있으면 사용자에게 다음을 실행하도록 안내한다:

```powershell
.\scripts\dev.ps1
```

그 후 이슈와 관련해 **정확히 무엇을 어디서 확인해야 하는지** 알려준다:
- 접속 URL (예: `http://localhost:3000/history`)
- 확인해야 할 구체적인 동작 (예: "각 카드에 전월 대비 증감이 초록/빨간색으로 표시되어야 함")
- 엣지 케이스가 있으면 함께 안내

서버 확인 후 Playwright e2e로 회귀 검증을 실행한다:

```bash
cd frontend && TEST_EMAIL=jijohn01@naver.com TEST_PASSWORD=<pw> npm run test:e2e
```

사용자가 확인을 마쳤다고 하면 Step 6으로 진행한다.

## Step 6 — PR 생성

```bash
git push -u origin <브랜치명>
gh pr create \
  --title "<type>: <제목>" \
  --body "$(cat <<'EOF'
## Summary
- <변경 내용 요약>

## Related Issue
Closes #<이슈번호>

## Test Plan
- [ ] `uv run pytest` 전체 통과
- [ ] `npm run build` 오류 없음
- [ ] Playwright e2e 통과
- [ ] <기능별 수동 확인 항목>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR URL을 사용자에게 알려주며 완료.

사용자가 PR 머지를 완료하면 워크트리를 정리한다:
- `EnterWorktree`로 생성한 경우: `ExitWorktree` 사용
- `git worktree add`로 생성한 경우: `git worktree remove <경로> --force`

## 주의사항

- 계획 승인 전에는 절대 코드를 수정하지 않는다.
- 워크트리 생성은 반드시 `superpowers:using-git-worktrees` 스킬을 통해 한다.
  - 이 프로젝트의 선언된 경로 규칙은 `../AssetNavigator-issue-<번호>` (부모 디렉터리) — 스킬이 이를 우선 적용한다.
- Baseline 테스트 실패 시 구현을 시작하지 않는다.
- 서버 실행은 사용자가 직접 한다 (`.\scripts\dev.ps1` 안내만).
- PR 생성 전 반드시 사용자 확인을 받는다.
