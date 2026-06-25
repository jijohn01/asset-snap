# 장부 소유권 이전 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** owner가 다른 멤버에게 소유권을 이전할 수 있도록 전용 백엔드 엔드포인트와 프론트엔드 인라인 확인 UI를 추가한다.

**Architecture:** `POST /transfer-ownership` 엔드포인트가 target→owner, caller→editor 순서로 두 DB 업데이트를 수행하고 실패 시 best-effort 롤백을 시도한다. 프론트엔드는 드롭다운에서 owner 선택 시 인라인 경고 UI로 전환하며, 사용자가 `나는 {장부명} 장부의 소유권을 {닉네임}에게 이전합니다` 문장을 직접 입력해야 버튼이 활성화된다.

**Tech Stack:** FastAPI, Supabase Python Client (service role key), pytest, Next.js 15 App Router, TypeScript, Tailwind CSS v4

## Global Constraints

- 백엔드: `uv run pytest` 전체 통과 유지 (`cd backend`에서 실행)
- 프론트엔드: `npm run build` 타입 에러 없이 통과 (`cd frontend`에서 실행)
- 워크트리 정책: 파일 수정 전 `git worktree add ../AssetNavigator-feat-ownership-transfer -b feat/66-ownership-transfer` 실행, 이후 해당 경로에서만 작업
- 프론트엔드 워크트리 주의: `node_modules`와 `.env.local`은 자동 복사 안 됨 — 수동 복사 후 `npm install` 필요

---

## 파일 구조

| 파일 | 변경 | 역할 |
|------|------|------|
| `backend/app/models/asset_group.py` | 수정 | `OwnershipTransferRequest` 모델 추가 |
| `backend/app/db/supabase.py` | 수정 | `transfer_ownership()` DB 함수 추가 |
| `backend/app/api/v1/endpoints/asset_groups.py` | 수정 | `POST /transfer-ownership` 엔드포인트 추가 |
| `backend/tests/test_transfer_ownership.py` | 신규 | DB 함수 단위 테스트 + 엔드포인트 테스트 |
| `frontend/src/lib/api.ts` | 수정 | `transferOwnership()` 함수 추가 |
| `frontend/src/app/(app)/settings/page.tsx` | 수정 | state 3개 추가, 드롭다운 핸들러 수정, 인라인 경고 UI 추가 |

---

### Task 1: 워크트리 준비

**Files:** 없음 (환경 설정)

- [ ] **Step 1: 워크트리 생성**

메인 디렉터리(`AssetNavigator/`)에서 실행:

```bash
git worktree add ../AssetNavigator-feat-ownership-transfer -b feat/66-ownership-transfer
```

- [ ] **Step 2: 프론트엔드 환경 복사**

```bash
cp frontend/.env.local ../AssetNavigator-feat-ownership-transfer/frontend/.env.local
cd ../AssetNavigator-feat-ownership-transfer/frontend && npm install
```

예상: `node_modules` 설치 완료

---

### Task 2: 백엔드 — DB 함수 + 모델

이후 모든 작업은 `../AssetNavigator-feat-ownership-transfer/` 에서 진행.

**Files:**
- Modify: `backend/app/models/asset_group.py`
- Modify: `backend/app/db/supabase.py`
- Create: `backend/tests/test_transfer_ownership.py`

**Interfaces:**
- Produces: `transfer_ownership(group_id: str, target_user_id: str, caller_id: str) -> None`
  - `ValueError("self_transfer")` — target == caller
  - `ValueError("not_member")` — target이 해당 그룹 멤버 아님
  - `ValueError("already_owner")` — target이 이미 owner

- [ ] **Step 1: 테스트 파일 작성**

`backend/tests/test_transfer_ownership.py` 신규 생성:

```python
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def mock_supabase():
    with patch("app.db.supabase.get_supabase") as mock_get:
        mock_db = MagicMock()
        mock_get.return_value = mock_db
        yield mock_db


def _set_member_data(mock_db, data: list):
    """select().eq().eq().execute().data 체인 반환값 설정 헬퍼."""
    (
        mock_db.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .execute.return_value
        .data
    ) = data


def test_self_transfer_raises():
    from app.db.supabase import transfer_ownership
    with pytest.raises(ValueError, match="self_transfer"):
        transfer_ownership("group-1", "same-uuid", "same-uuid")


def test_not_member_raises(mock_supabase):
    from app.db.supabase import transfer_ownership
    _set_member_data(mock_supabase, [])
    with pytest.raises(ValueError, match="not_member"):
        transfer_ownership("group-1", "target-uuid", "caller-uuid")


def test_already_owner_raises(mock_supabase):
    from app.db.supabase import transfer_ownership
    _set_member_data(mock_supabase, [{"role": "owner"}])
    with pytest.raises(ValueError, match="already_owner"):
        transfer_ownership("group-1", "target-uuid", "caller-uuid")


def test_success_updates_both_roles(mock_supabase):
    from app.db.supabase import transfer_ownership
    _set_member_data(mock_supabase, [{"role": "editor"}])

    transfer_ownership("group-1", "target-uuid", "caller-uuid")

    update_calls = mock_supabase.table.return_value.update.call_args_list
    updated_roles = [c[0][0]["role"] for c in update_calls]
    assert "owner" in updated_roles
    assert "editor" in updated_roles
    assert len(updated_roles) == 2
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend && uv run pytest tests/test_transfer_ownership.py -v
```

예상: `ImportError` 또는 `ModuleNotFoundError` (함수 미정의)

- [ ] **Step 3: `OwnershipTransferRequest` 모델 추가**

`backend/app/models/asset_group.py` 파일 끝에 추가:

```python
class OwnershipTransferRequest(BaseModel):
    target_user_id: str
```

- [ ] **Step 4: `transfer_ownership()` DB 함수 구현**

`backend/app/db/supabase.py`의 `remove_member` 함수 다음에 추가:

```python
def transfer_ownership(group_id: str, target_user_id: str, caller_id: str) -> None:
    if target_user_id == caller_id:
        raise ValueError("self_transfer")

    db = get_supabase()

    res = (
        db.table("asset_group_members")
        .select("role")
        .eq("group_id", group_id)
        .eq("user_id", target_user_id)
        .execute()
    )
    if not res.data:
        raise ValueError("not_member")
    if res.data[0]["role"] == "owner":
        raise ValueError("already_owner")

    target_prev_role = res.data[0]["role"]

    (
        db.table("asset_group_members")
        .update({"role": "owner"})
        .eq("group_id", group_id)
        .eq("user_id", target_user_id)
        .execute()
    )
    try:
        (
            db.table("asset_group_members")
            .update({"role": "editor"})
            .eq("group_id", group_id)
            .eq("user_id", caller_id)
            .execute()
        )
    except Exception:
        (
            db.table("asset_group_members")
            .update({"role": target_prev_role})
            .eq("group_id", group_id)
            .eq("user_id", target_user_id)
            .execute()
        )
        raise
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
cd backend && uv run pytest tests/test_transfer_ownership.py -v
```

예상:
```
test_self_transfer_raises PASSED
test_not_member_raises PASSED
test_already_owner_raises PASSED
test_success_updates_both_roles PASSED
4 passed
```

- [ ] **Step 6: 기존 테스트 전체 통과 확인**

```bash
cd backend && uv run pytest -v
```

예상: 모든 기존 테스트 PASSED

- [ ] **Step 7: 커밋**

```bash
git add backend/app/models/asset_group.py backend/app/db/supabase.py backend/tests/test_transfer_ownership.py
git commit -m "feat: 소유권 이전 DB 함수 + 모델 추가 (#66)"
```

---

### Task 3: 백엔드 — 엔드포인트

**Files:**
- Modify: `backend/app/api/v1/endpoints/asset_groups.py`
- Modify: `backend/tests/test_transfer_ownership.py`

**Interfaces:**
- Consumes: `transfer_ownership(group_id, target_user_id, caller_id)` (Task 2)
- Produces: `POST /api/v1/asset-groups/{group_id}/transfer-ownership` → 204 / 400 / 403

- [ ] **Step 1: 엔드포인트 테스트 추가**

`backend/tests/test_transfer_ownership.py` 끝에 추가:

```python
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user

CALLER_ID = "caller-uuid"


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: CALLER_ID
    yield
    app.dependency_overrides.clear()


def test_endpoint_success(client, override_auth):
    with patch("app.api.v1.endpoints.asset_groups.db") as mock_db:
        mock_db.get_member_role.return_value = "owner"
        mock_db.transfer_ownership.return_value = None
        response = client.post(
            "/api/v1/asset-groups/group-1/transfer-ownership",
            json={"target_user_id": "target-uuid"},
        )
    assert response.status_code == 204


def test_endpoint_forbidden_non_owner(client, override_auth):
    with patch("app.api.v1.endpoints.asset_groups.db") as mock_db:
        mock_db.get_member_role.return_value = "editor"
        response = client.post(
            "/api/v1/asset-groups/group-1/transfer-ownership",
            json={"target_user_id": "target-uuid"},
        )
    assert response.status_code == 403


def test_endpoint_bad_request_not_member(client, override_auth):
    with patch("app.api.v1.endpoints.asset_groups.db") as mock_db:
        mock_db.get_member_role.return_value = "owner"
        mock_db.transfer_ownership.side_effect = ValueError("not_member")
        response = client.post(
            "/api/v1/asset-groups/group-1/transfer-ownership",
            json={"target_user_id": "target-uuid"},
        )
    assert response.status_code == 400
    assert response.json()["detail"] == "not_member"


def test_endpoint_requires_auth(client):
    response = client.post(
        "/api/v1/asset-groups/group-1/transfer-ownership",
        json={"target_user_id": "target-uuid"},
    )
    assert response.status_code in (401, 403)
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend && uv run pytest tests/test_transfer_ownership.py::test_endpoint_success tests/test_transfer_ownership.py::test_endpoint_forbidden_non_owner tests/test_transfer_ownership.py::test_endpoint_bad_request_not_member tests/test_transfer_ownership.py::test_endpoint_requires_auth -v
```

예상: `404 Not Found` (엔드포인트 미등록)

- [ ] **Step 3: 엔드포인트 구현**

`backend/app/api/v1/endpoints/asset_groups.py` import 수정 — `OwnershipTransferRequest` 추가:

```python
from app.models.asset_group import (
    AssetGroupCreate, AssetGroupUpdate, AssetGroupResponse,
    MemberInvite, MemberRoleUpdate, MemberResponse,
    OwnershipTransferRequest,
)
```

`remove_member` 엔드포인트 다음, `_flatten_member` 함수 앞에 추가:

```python
@router.post("/{group_id}/transfer-ownership", status_code=204)
def transfer_ownership_endpoint(
    group_id: str,
    body: OwnershipTransferRequest,
    user_id: str = Depends(get_current_user),
):
    _require_role(group_id, user_id, "owner")
    try:
        db.transfer_ownership(group_id, body.target_user_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

- [ ] **Step 4: 테스트 실행 — 전체 통과 확인**

```bash
cd backend && uv run pytest tests/test_transfer_ownership.py -v
```

예상: 8개 테스트 모두 PASSED

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
cd backend && uv run pytest -v
```

예상: 모든 테스트 PASSED

- [ ] **Step 6: 커밋**

```bash
git add backend/app/api/v1/endpoints/asset_groups.py backend/tests/test_transfer_ownership.py
git commit -m "feat: POST /transfer-ownership 엔드포인트 추가 (#66)"
```

---

### Task 4: 프론트엔드 — API 함수 + 설정 UI

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/asset-groups/{group_id}/transfer-ownership` (Task 3)

- [ ] **Step 1: `api.ts`에 `transferOwnership` 추가**

`frontend/src/lib/api.ts`의 `removeMember` 함수 다음에 추가:

```typescript
export async function transferOwnership(groupId: string, targetUserId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/asset-groups/${groupId}/transfer-ownership`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...await authHeader() },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "소유권 이전에 실패했습니다.");
  }
}
```

- [ ] **Step 2: `settings/page.tsx` — import에 `transferOwnership` 추가**

기존 import 블록을 아래로 교체:

```typescript
import {
  fetchGroups,
  fetchGroupMembers,
  createGroup,
  updateGroup,
  inviteMember,
  updateMemberRole,
  removeMember,
  transferOwnership,
  setActiveGroupId,
  type Group,
  type Member,
} from "@/lib/api";
```

- [ ] **Step 3: `settings/page.tsx` — state 추가**

`const [currentUserId, setCurrentUserId] = useState<string | null>(null);` 바로 다음에 추가:

```typescript
const [transferringTo, setTransferringTo] = useState<{
  groupId: string;
  userId: string;
} | null>(null);
const [transferConfirmInput, setTransferConfirmInput] = useState("");
const [transferLoading, setTransferLoading] = useState(false);
const [transferError, setTransferError] = useState("");
```

- [ ] **Step 4: `settings/page.tsx` — `handleRoleChange` 수정**

기존 `handleRoleChange` 함수 전체를 아래로 교체:

```typescript
async function handleRoleChange(groupId: string, userId: string, role: string) {
  if (role === "owner") {
    setTransferringTo({ groupId, userId });
    setTransferConfirmInput("");
    setTransferError("");
    return;
  }
  await updateMemberRole(groupId, userId, role);
  setMembersByGroup((prev) => ({
    ...prev,
    [groupId]: (prev[groupId] ?? []).map((m) =>
      m.user_id === userId ? { ...m, role } : m
    ),
  }));
}
```

- [ ] **Step 5: `settings/page.tsx` — `handleTransferOwnership` 추가**

`handleRoleChange` 바로 다음에 추가:

```typescript
async function handleTransferOwnership(group: Group, targetMember: Member) {
  setTransferLoading(true);
  setTransferError("");
  try {
    await transferOwnership(group.id, targetMember.user_id);
    setMembersByGroup((prev) => ({
      ...prev,
      [group.id]: (prev[group.id] ?? []).map((m) =>
        m.user_id === targetMember.user_id ? { ...m, role: "owner" } : m
      ),
    }));
    setGroups((prev) =>
      prev.map((g) => g.id === group.id ? { ...g, role: "editor" } : g)
    );
    setTransferringTo(null);
    setTransferConfirmInput("");
  } catch (e) {
    setTransferError((e as Error).message);
  } finally {
    setTransferLoading(false);
  }
}
```

- [ ] **Step 6: `settings/page.tsx` — 멤버 행 렌더링 수정**

멤버 행의 `{m.user_id !== currentUserId ? ( ... ) : ( ... )}` 블록 전체를 아래로 교체:

```tsx
{m.user_id !== currentUserId ? (
  transferringTo?.groupId === group.id && transferringTo?.userId === m.user_id ? (
    <div className="flex flex-col gap-2 py-1 w-full">
      <p className="text-xs font-semibold text-[#f04452]">
        소유권을 이전하면 되돌릴 수 없습니다.
      </p>
      <p className="text-xs text-[#4e5968]">
        {m.display_name ?? "이 멤버"}님이 새 owner가 되고, 나는 editor로 변경됩니다.
      </p>
      <p className="mt-1 text-xs text-[#4e5968]">아래 문장을 그대로 입력하세요:</p>
      <code className="block rounded-lg bg-[rgba(240,68,82,0.06)] px-3 py-2 text-xs font-mono text-[#f04452] break-all select-all">
        {`나는 ${group.name} 장부의 소유권을 ${m.display_name ?? "알 수 없음"}에게 이전합니다`}
      </code>
      <input
        type="text"
        value={transferConfirmInput}
        onChange={(e) => setTransferConfirmInput(e.target.value)}
        placeholder="위 문장을 그대로 입력"
        className="rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-3 py-2 text-xs text-[#333d4b] placeholder:text-[#b0b8c1] outline-none focus:border-[#f04452] transition-colors"
      />
      {transferError && (
        <p className="text-xs text-[#f04452]">{transferError}</p>
      )}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => handleTransferOwnership(group, m)}
          disabled={
            transferConfirmInput !==
              `나는 ${group.name} 장부의 소유권을 ${m.display_name ?? "알 수 없음"}에게 이전합니다` ||
            transferLoading
          }
          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white bg-[#f04452] hover:bg-[#d63b47] disabled:opacity-40 transition-colors"
        >
          {transferLoading ? "이전 중..." : "소유권 이전"}
        </button>
        <button
          onClick={() => {
            setTransferringTo(null);
            setTransferConfirmInput("");
            setTransferError("");
          }}
          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#4e5968] bg-[#f2f4f6] hover:bg-[#e8ecf0] transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  ) : (
    <>
      <select
        value={m.role}
        onChange={(e) => handleRoleChange(group.id, m.user_id, e.target.value)}
        className="rounded-lg border border-[#e5e8eb] bg-white px-2 py-1.5 text-xs text-[#4e5968] outline-none focus:border-[#3182f6] cursor-pointer"
      >
        {members.length > 1 && <option value="owner">owner</option>}
        <option value="editor">editor</option>
        <option value="viewer">viewer</option>
      </select>
      <button
        onClick={() => handleRemoveMember(group.id, m.user_id)}
        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#f04452] bg-[rgba(240,68,82,0.08)] hover:bg-[rgba(240,68,82,0.15)] transition-colors"
      >
        제거
      </button>
    </>
  )
) : (
  <span className={`rounded-xl px-2 py-0.5 text-xs font-bold ${ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer}`}>
    {m.role}
  </span>
)}
```

참고: `members.length > 1`일 때만 `owner` 옵션 노출 — 혼자인 장부에서 이전 불가.

- [ ] **Step 7: 타입 체크 + 빌드**

```bash
cd frontend && npm run build
```

예상: 에러 없이 빌드 완료. 타입 오류 있으면 수정 후 재실행.

- [ ] **Step 8: 수동 테스트**

개발 서버 실행 (프로젝트 루트에서):

```powershell
.\scripts\dev.ps1
```

브라우저 http://localhost:3000/settings 에서 확인:

1. 멤버가 있는 장부의 드롭다운에서 `owner` 선택 → 인라인 경고 UI로 전환됨
2. 경고 문구가 빨간색으로 표시됨
3. 확인 문장(`나는 XXX 장부의 소유권을 YYY에게 이전합니다`)이 코드 블록으로 표시됨
4. 다른 텍스트 입력 시 [소유권 이전] 버튼 비활성(회색)
5. 정확한 문장 입력 시 버튼 활성화(빨간색)
6. [소유권 이전] 클릭 → 성공 시 카드 role 배지 `editor`로 변경, 멤버 관리 섹션 숨김
7. [취소] 클릭 → 경고 UI 해제, 드롭다운 원상태
8. 멤버가 자신만인 장부에서 드롭다운에 `owner` 옵션 없음

- [ ] **Step 9: 커밋**

```bash
git add "frontend/src/lib/api.ts" "frontend/src/app/(app)/settings/page.tsx"
git commit -m "feat: 소유권 이전 프론트엔드 UI 추가 (#66)"
```

---

## 완료 후 PR 생성

```bash
git push -u origin feat/66-ownership-transfer
gh pr create --title "feat: 장부 소유권 이전 (#66)" --body "$(cat <<'EOF'
## Summary
- POST /api/v1/asset-groups/{group_id}/transfer-ownership 엔드포인트 추가
- 드롭다운 owner 선택 시 인라인 경고 UI로 전환
- 확인 문장 직접 입력 패턴 (나는 {장부명} 장부의 소유권을 {닉네임}에게 이전합니다)
- 원자적 순서로 두 멤버 role 업데이트 (target→owner, caller→editor, 실패 시 롤백)
- 혼자인 장부에서 owner 옵션 비노출

## Test plan
- [ ] `uv run pytest` 전체 통과 (8개 신규 테스트 포함)
- [ ] `npm run build` 타입 에러 없음
- [ ] 수동 테스트 Step 8 항목 전체 확인

Closes #66
EOF
)"
```
