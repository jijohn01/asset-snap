# 장부 삭제 설계 — 이슈 #67

## 목표

Owner가 불필요한 장부를 삭제할 수 있어야 한다. 삭제 시 모든 스냅샷과 멤버 정보가 영구 삭제된다.

## 선결 조건 완료 상태

- #66 소유권 이전: 이미 구현됨 (settings 페이지 소유권 이전 플로우 존재)
- #93/#94 Group type 제거: 완료 — `type=personal` 삭제 불가 조건 제거됨, 모든 장부 삭제 가능
- #95 빈 상태 처리: 완료 — 마지막 장부 삭제 후 noGroups 상태 자동 처리됨

## 아키텍처

### Backend (이미 구현 완료)

- `DELETE /api/v1/asset-groups/{group_id}` 엔드포인트 존재 (status 204)
- `_require_role(group_id, user_id, "owner")` 권한 검증
- `db.delete_group(group_id)` — `asset_groups` row 삭제
- DB cascade: `asset_group_members`, `snapshots` 모두 `ON DELETE CASCADE`
- **추가 작업 없음**

### Frontend

#### `frontend/src/components/ConfirmModal.tsx`

`children`과 `confirmDisabled` prop 추가 (최소 변경):

```ts
interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;   // 추가
  children?: React.ReactNode;  // 추가
  onConfirm: () => void;
  onCancel: () => void;
}
```

JSX: `{description && <p>...</p>}` 다음에 `{children}` 삽입.  
확인 버튼: `disabled={confirmDisabled}` + disabled 스타일(`opacity-50 cursor-not-allowed`) 추가.

#### `frontend/src/lib/api.ts`

`deleteGroup(groupId: string): Promise<void>` 추가:
- `DELETE ${API_URL}/api/v1/asset-groups/${groupId}`
- auth header 포함
- 204 이외 응답 시 throw

#### `frontend/src/app/(app)/settings/page.tsx`

**삭제 버튼**: 각 장부 카드 헤더에 `Trash2` 아이콘 버튼 추가 — `isOwner`일 때만 표시

**State 추가**:
```ts
const [deleteTarget, setDeleteTarget] = useState<{ groupId: string; groupName: string } | null>(null);
const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
const [deleteNameInput, setDeleteNameInput] = useState("");
const [deleteLoading, setDeleteLoading] = useState(false);
const [deleteError, setDeleteError] = useState("");
```

`memberCount`는 state에 저장하지 않음 — 렌더링 시 `membersByGroup[deleteTarget.groupId]?.length ?? 0`으로 계산.

**2단계 확인 흐름**:

1단계 — `ConfirmModal`:
- `open={deleteTarget !== null && deleteStep === 1}`
- 제목: `"장부를 삭제할까요?"`
- description: 멤버 수 > 0이면 `"멤버가 N명 있습니다. 이 장부를 삭제하면 모든 스냅샷 데이터와 멤버 정보가 영구 삭제됩니다."`, 0명이면 `"이 장부를 삭제하면 모든 스냅샷 데이터가 영구 삭제됩니다."`
- confirmLabel: `"계속"`
- onConfirm: `setDeleteStep(2)`

2단계 — `ConfirmModal` + children (text input):
- `open={deleteTarget !== null && deleteStep === 2}`
- 제목: `"정말 삭제할까요?"`
- description 없음
- children: 장부 이름 입력 UI
  ```tsx
  <div className="mt-3 space-y-2">
    <p className="text-sm text-[#8b95a1]">
      장부 이름을 입력하면 영구 삭제됩니다.
    </p>
    <input
      type="text"
      value={deleteNameInput}
      onChange={e => { setDeleteNameInput(e.target.value); setDeleteError(""); }}
      placeholder={deleteTarget?.groupName}
      className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm focus:outline-none focus:border-[#3182f6]"
      autoFocus
    />
    {deleteError && <p className="text-xs text-[#F04452]">{deleteError}</p>}
  </div>
  ```
- confirmLabel: `"삭제"`
- confirmDisabled: `deleteNameInput !== deleteTarget?.groupName || deleteLoading`
- onConfirm: `handleDeleteGroup()`

**handleDeleteGroup**:
```ts
async function handleDeleteGroup() {
  if (!deleteTarget || deleteNameInput !== deleteTarget.groupName) return;
  setDeleteLoading(true);
  setDeleteError("");
  try {
    await deleteGroup(deleteTarget.groupId);
    // state 정리
    setGroups(prev => prev.filter(g => g.id !== deleteTarget.groupId));
    setMembersByGroup(prev => {
      const next = { ...prev };
      delete next[deleteTarget.groupId];
      return next;
    });
    // 활성 장부였다면 전환
    const activeId = typeof window !== "undefined" ? localStorage.getItem("activeGroupId") : null;
    if (activeId === deleteTarget.groupId) {
      const remaining = groups.filter(g => g.id !== deleteTarget.groupId);
      if (remaining.length > 0) {
        setActiveGroupId(remaining[0].id);
      } else {
        resetGroupIdCache();
        if (typeof window !== "undefined") localStorage.removeItem("activeGroupId");
      }
    }
    // 다른 페이지(대시보드/히스토리)도 갱신
    window.dispatchEvent(new CustomEvent("group-changed"));
    // 모달 닫기
    setDeleteTarget(null);
    setDeleteStep(1);
    setDeleteNameInput("");
  } catch {
    setDeleteError("삭제에 실패했습니다. 다시 시도해주세요.");
  } finally {
    setDeleteLoading(false);
  }
}
```

**모달 닫기(취소) 공통 핸들러**:
```ts
function handleDeleteCancel() {
  setDeleteTarget(null);
  setDeleteStep(1);
  setDeleteNameInput("");
  setDeleteError("");
}
```

## 2단계 UI 레이아웃

1단계 (ConfirmModal):
```
┌─────────────────────────────────────┐
│ 장부를 삭제할까요?                    │
│                                     │
│ 멤버가 2명 있습니다. 이 장부를 삭제   │
│ 하면 모든 스냅샷 데이터와 멤버 정보가 │
│ 영구 삭제됩니다.                     │
│                                     │
│         [취소]        [계속]         │
└─────────────────────────────────────┘
```

2단계 (ConfirmModal + children):
```
┌─────────────────────────────────────┐
│ 정말 삭제할까요?                      │
│                                     │
│ 장부 이름을 입력하면 영구 삭제됩니다.  │
│ [________________입력________________]│
│                                     │
│         [취소]      [삭제] (빨간색)   │
└─────────────────────────────────────┘
```

## Import 변경

`settings/page.tsx`:
- lucide-react: `Trash2` 추가
- api: `deleteGroup`, `resetGroupIdCache` 추가

## 완료 조건

- [ ] ConfirmModal에 `children`, `confirmDisabled` prop 추가
- [ ] `deleteGroup` API 함수 추가 (api.ts)
- [ ] 모든 장부 카드에 삭제 버튼 표시 (owner만)
- [ ] 1단계: ConfirmModal 경고 + 멤버 수 조건부 표시
- [ ] 2단계: ConfirmModal + 이름 입력 (일치 시 삭제 버튼 활성화)
- [ ] 삭제 성공 후 목록에서 즉시 제거 + membersByGroup 정리
- [ ] 활성 장부 삭제 시 다른 장부로 전환 (없으면 캐시 초기화)
- [ ] `group-changed` 이벤트 발송
- [ ] e2e 테스트

## 범위 외

- 소유권 이전 유도 UI (이미 settings에 이전 기능 있으므로 사용자가 직접 이전 후 삭제)
- DB 마이그레이션 불필요 (cascade 이미 존재)
- Backend 변경 불필요
- Topbar 즉시 갱신 (기존 leave-group과 동일한 pre-existing 제약 — 다음 네비게이션 시 반영)
