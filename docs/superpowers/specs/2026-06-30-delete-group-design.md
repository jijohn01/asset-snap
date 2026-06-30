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

#### `frontend/src/lib/api.ts`
- `deleteGroup(groupId: string): Promise<void>` 추가
  - `DELETE ${API_URL}/api/v1/asset-groups/${groupId}`
  - auth header 포함
  - 성공 시 반환값 없음, 실패 시 throw

#### `frontend/src/app/(app)/settings/page.tsx`

**삭제 버튼**: 각 장부 카드 헤더에 휴지통 아이콘 버튼 추가 — `isOwner`일 때만 표시

**State 추가** (소유권 이전 패턴과 동일):
```ts
const [deleteTarget, setDeleteTarget] = useState<{ groupId: string; groupName: string; memberCount: number } | null>(null);
const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
const [deleteNameInput, setDeleteNameInput] = useState("");
const [deleteLoading, setDeleteLoading] = useState(false);
const [deleteError, setDeleteError] = useState("");
```

**2단계 확인 흐름**:

1단계 — `ConfirmModal` (기존 컴포넌트 재사용):
- 제목: `"장부를 삭제할까요?"`
- 본문: 멤버 수 > 0이면 `"멤버가 N명 있습니다. "` 접두사 포함 + `"이 장부를 삭제하면 모든 스냅샷 데이터와 멤버 정보가 영구 삭제됩니다."`
- 확인 버튼: `"계속"` (destructive 스타일 없음 — 아직 돌이킬 수 있는 단계)

2단계 — 인라인 (소유권 이전과 동일 패턴, `ConfirmModal` 아님):
- 상단 경고문: `"장부 이름을 입력하면 영구 삭제됩니다."`
- 입력 placeholder: `"장부 이름 입력"`
- 삭제 버튼 활성화 조건: `deleteNameInput === deleteTarget.groupName`
- 삭제 버튼 스타일: destructive (`bg-[#F04452]` / 빨간색)
- 에러 표시 영역

**삭제 후 처리**:
```ts
setGroups(prev => prev.filter(g => g.id !== groupId));
// 활성 장부였다면 다음 장부로 전환
const activeId = localStorage.getItem("activeGroupId");
if (activeId === groupId) {
  const remaining = groups.filter(g => g.id !== groupId);
  if (remaining.length > 0) {
    setActiveGroupId(remaining[0].id);
  } else {
    resetGroupIdCache(); // 캐시 초기화 → 대시보드 이동 시 noGroups 상태
    localStorage.removeItem("activeGroupId");
  }
}
```

## 2단계 UI 레이아웃

1단계 (ConfirmModal):
```
┌─────────────────────────────────────┐
│ 장부를 삭제할까요?                    │
│                                     │
│ [멤버가 2명 있습니다. ]              │
│ 이 장부를 삭제하면 모든 스냅샷       │
│ 데이터와 멤버 정보가 영구 삭제됩니다. │
│                                     │
│         [취소]        [계속]         │
└─────────────────────────────────────┘
```

2단계 (인라인 폼 — 카드 내부 or ConfirmModal):
```
┌─────────────────────────────────────┐
│ 장부 이름을 입력하면 영구 삭제됩니다.  │
│                                     │
│ [________________입력________________]│
│                                     │
│ [취소]               [삭제] (빨간색)  │
└─────────────────────────────────────┘
```

## 완료 조건

- [ ] 모든 장부에 삭제 버튼 표시 (owner만)
- [ ] 1단계: ConfirmModal 경고 + 멤버 수 표시
- [ ] 2단계: 장부 이름 일치 시에만 삭제 버튼 활성화
- [ ] 삭제 성공 후 목록에서 즉시 제거
- [ ] 활성 장부 삭제 시 다른 장부로 전환 (없으면 빈 상태)
- [ ] e2e 테스트

## 범위 외

- 소유권 이전 유도 UI (이미 settings에 이전 기능 있으므로 사용자가 직접 이전 후 삭제)
- DB 마이그레이션 불필요 (cascade 이미 존재)
- Backend 변경 불필요
