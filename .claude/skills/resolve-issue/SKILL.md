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

## Step 4 — 워크트리 생성 및 수정

브랜치 이름 규칙: `{type}/{issue-number}-{short-description}`
- type: `fix` (버그), `feat` (기능), `chore` (설정/정리), `refactor` (리팩터)
- short-description: 영문 kebab-case, 핵심 단어만 (3단어 이내)
- 예: `fix/42-history-net-worth-diff`, `feat/15-export-csv`

```bash
git worktree add ../AssetNavigator-issue-<번호> -b <브랜치명>
```

워크트리 경로(`../AssetNavigator-issue-<번호>`)에서 작업한다.
수정 완료 후 커밋한다:

```bash
git add <수정된 파일들>
git commit -m "<type>: <한 줄 요약>

Closes #<이슈번호>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

## Step 5 — 서버 확인 안내

서버가 아직 안 떠 있으면 사용자에게 다음을 실행하도록 안내한다:

```powershell
.\scripts\dev.ps1
```

그 후 이슈와 관련해 **정확히 무엇을 어디서 확인해야 하는지** 알려준다:
- 접속 URL (예: `http://localhost:3000/history`)
- 확인해야 할 구체적인 동작 (예: "각 카드에 전월 대비 증감이 초록/빨간색으로 표시되어야 함")
- 엣지 케이스가 있으면 함께 안내

사용자가 확인을 마쳤다고 하면 Step 6으로 진행한다.

## Step 6 — PR 생성

```bash
cd ../AssetNavigator-issue-<번호>
git push -u origin <브랜치명>
gh pr create \
  --title "<type>: <제목>" \
  --body "$(cat <<'EOF'
## Summary
- <변경 내용 요약>

## Related Issue
Closes #<이슈번호>

## Test Plan
- [ ] <확인 항목 1>
- [ ] <확인 항목 2>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR URL을 사용자에게 알려주며 완료.

## 주의사항

- 계획 승인 전에는 절대 코드를 수정하지 않는다.
- 워크트리는 `../AssetNavigator-issue-<번호>` 경로에 생성한다 (메인 디렉터리 오염 방지).
- 서버 실행은 사용자가 직접 한다 (`.\scripts\dev.ps1` 안내만).
- PR 생성 전 반드시 사용자 확인을 받는다.
