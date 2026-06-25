# 장부 소유권 이전 설계 (Issue #66)

## 개요

장부(asset group)의 owner가 다른 멤버에게 소유권을 이전할 수 있는 기능. 장부 삭제(#67)·계정 탈퇴(#68) 구현의 선결 조건.

## 범위

- **포함:** 소유권 이전 엔드포인트, 인라인 confirm UI, 로컬 state 업데이트
- **제외:** 장부 삭제, 계정 탈퇴, DB 제약 추가 (owner 유일성은 앱 레이어에서 보장)

---

## 백엔드

### 새 엔드포인트

```
POST /api/v1/asset-groups/{group_id}/transfer-ownership
```

- **권한:** 요청자가 해당 그룹의 `owner`여야 함 (기존 `_require_role` 헬퍼 사용)
- **Body:** `{ "target_user_id": "<uuid>" }`
- **성공 응답:** `204 No Content`
- **실패 응답:**
  - `400` — target_user_id가 그룹 멤버가 아님
  - `400` — target_user_id가 이미 owner (이전 불필요)
  - `403` — 요청자가 owner가 아님

### 새 Pydantic 모델 (`models/asset_group.py`)

```python
class OwnershipTransferRequest(BaseModel):
    target_user_id: str
```

### 새 DB 함수 (`db/supabase.py`)

`transfer_ownership(group_id, target_user_id, caller_id) -> None`

순서:
1. `target_user_id == caller_id` 이면 `ValueError("self_transfer")` (자기 자신에게 이전 불가)
2. target의 현재 role 조회 — 멤버 아니면 `ValueError("not_member")`
3. target이 이미 owner면 `ValueError("already_owner")`
4. target role → `owner` 업데이트
5. caller role → `editor` 업데이트 (실패 시 target을 원래 role로 롤백 후 raise)

롤백은 best-effort: 단일 Supabase 클라이언트(REST)라 진짜 트랜잭션 불가. 실패 확률은 극히 낮고, 실패 시 500을 반환해 프론트엔드가 재시도하도록 유도.

### 엔드포인트 등록 (`endpoints/asset_groups.py`)

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

---

## 프론트엔드

### `api.ts` 새 함수

```typescript
export async function transferOwnership(
  groupId: string,
  targetUserId: string,
): Promise<void>
```

`POST /api/v1/asset-groups/{groupId}/transfer-ownership` 호출. 실패 시 Error throw.

### `settings/page.tsx` 변경

**새 state:**
```typescript
const [transferringTo, setTransferringTo] = useState<{
  groupId: string;
  userId: string;
} | null>(null);
const [transferConfirmInput, setTransferConfirmInput] = useState("");
const [transferLoading, setTransferLoading] = useState(false);
```

**드롭다운 `onChange` 수정:**
- `owner` 선택 시: `setTransferringTo({ groupId, userId })`, `setTransferConfirmInput("")`, select 값을 원래 role로 복원 (드롭다운은 변하지 않은 것처럼 보임)
- 그 외: 기존 `handleRoleChange` 그대로

**멤버 행 렌더링 수정:**

`transferringTo?.groupId === groupId && transferringTo?.userId === m.user_id` 이면 드롭다운+제거 버튼 대신 인라인 경고 UI로 전환:

```
┌─────────────────────────────────────────────────┐
│ ⚠ 소유권을 이전하면 되돌릴 수 없습니다.           │
│ OOO님이 이 장부의 새 owner가 되고,               │
│ 나는 editor로 변경됩니다.                        │
│                                                 │
│ 계속하려면 아래에 `OOO` 을(를) 입력하세요:       │
│ [               ]                               │
│                                                 │
│ [소유권 이전]  [취소]                            │
│  (입력 일치 전 비활성화)                         │
└─────────────────────────────────────────────────┘
```

- 경고 문구는 `text-[#f04452]` 계열로 강조
- 안내 문구에 `m.display_name`을 **코드 블록 스타일** (`font-mono`, 배경 강조)로 표시해 사용자가 무엇을 입력해야 하는지 바로 알 수 있게 함
- 입력값이 `m.display_name`과 정확히 일치할 때만 [소유권 이전] 버튼 활성화
- [소유권 이전] 클릭 → `transferOwnership()` 호출, 성공 시 state 업데이트
- [취소] 클릭 → `setTransferringTo(null)`, `setTransferConfirmInput("")`

**성공 시 로컬 state 업데이트:**
1. `membersByGroup[groupId]`에서 target 멤버 role → `owner`
2. `groups`에서 해당 그룹 role → `editor`
3. `setTransferringTo(null)`, `setTransferConfirmInput("")`

그룹 role이 `editor`로 바뀌면 `isOwner = false`가 되어 멤버 관리 섹션이 자동으로 숨겨짐.

### 멤버가 없는 장부 처리

`members` 배열에 자기 자신만 있는 경우(길이 1), 드롭다운에서 `owner` 옵션을 렌더링하지 않음. 이전 대상이 없으므로 UI 레벨에서 차단.

---

## UX 흐름 요약

```
드롭다운에서 owner 선택
  → select 값 복원 (원래 role 유지)
  → 해당 멤버 행: 경고 UI로 전환
      ⚠ "소유권을 이전하면 되돌릴 수 없습니다."
         "OOO님이 새 owner가 되고, 나는 editor로 변경됩니다."
      입력창: "계속하려면 닉네임을 입력하세요"
      [소유권 이전 (비활성)] [취소]
  → 닉네임 정확히 입력 시 [소유권 이전] 활성화
  → [소유권 이전]: POST /transfer-ownership
      성공 → state 업데이트, 카드 role 배지 editor로 변경, 멤버 관리 숨김
      실패 → 경고 UI 유지, 에러 메시지 표시
  → [취소]: 경고 UI 해제, 입력값 초기화
```

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `backend/app/models/asset_group.py` | `OwnershipTransferRequest` 모델 추가 |
| `backend/app/db/supabase.py` | `transfer_ownership()` 함수 추가 |
| `backend/app/api/v1/endpoints/asset_groups.py` | `POST /transfer-ownership` 엔드포인트 추가 |
| `frontend/src/lib/api.ts` | `transferOwnership()` 함수 추가 |
| `frontend/src/app/(app)/settings/page.tsx` | `transferringTo` / `transferConfirmInput` / `transferLoading` state, 드롭다운 핸들러, 인라인 경고+입력 UI |
