# 장부 탈퇴 (Leave Group) 설계 — 이슈 #65

## 목표

editor/viewer 멤버가 직접 장부에서 탈퇴할 수 있게 한다. 현재는 owner만 멤버를 제거할 수 있어, 탈퇴를 원하는 멤버가 owner에게 요청해야 하는 불편이 있다.

## 범위

| 위치 | 변경 | 파일 |
|------|------|------|
| 설정 > 내 장부 목록 | 비owner 장부 카드 헤더에 "탈퇴" 버튼 추가 | `app/(app)/settings/page.tsx` |
| API | 기존 `removeMember(groupId, userId)` 재사용 | `lib/api.ts` (변경 없음) |
| 모달 | 기존 `ConfirmModal` 재사용 | `components/ConfirmModal.tsx` (변경 없음) |

## UI 설계

### 탈퇴 버튼 위치

비owner 장부 카드 헤더 우측 버튼 영역에 "보기" 버튼 옆에 "탈퇴" 버튼 추가:

```
[장부명] [editor badge]        [탈퇴] [보기]
```

- 스타일: 빨간 계열 ghost 버튼 (`text-[#f04452] bg-[rgba(240,68,82,0.08)] hover:bg-[rgba(240,68,82,0.15)]`)
- `group.type === "personal"`인 경우 탈퇴 버튼 표시 안 함 (개인 장부는 탈퇴 개념 없음)

### 확인 모달

기존 `ConfirmModal` 컴포넌트 사용:

- **제목:** `"장부 탈퇴"`
- **설명:** `"${groupName}에서 탈퇴합니다. 다시 참여하려면 owner의 초대가 필요합니다."`
- **확인 버튼:** `"탈퇴"` (빨간색 — ConfirmModal 기본)
- **취소 버튼:** `"취소"`

## 로직 설계

### State 추가

```tsx
const [leaveTarget, setLeaveTarget] = useState<{ groupId: string; groupName: string } | null>(null);
```

### 탈퇴 핸들러

```tsx
async function handleLeaveGroup(groupId: string) {
  if (!currentUserId) return;
  await removeMember(groupId, currentUserId);

  const personalGroup = groups.find((g) => g.type === "personal");
  const activeId = localStorage.getItem("activeGroupId"); // or getActiveGroupId()
  if (activeId === groupId && personalGroup) {
    setActiveGroupId(personalGroup.id);
  }

  setGroups((prev) => prev.filter((g) => g.id !== groupId));
}
```

### 활성 장부 전환

- 탈퇴한 장부가 현재 활성 장부인 경우: `personal` 타입 장부 id로 `setActiveGroupId` 호출
- personal 장부는 항상 존재하므로 fallback 필요 없음

## 결정 사항

- 개인 장부(`type === "personal"`)에는 탈퇴 버튼 표시 안 함
- owner 장부에도 탈퇴 버튼 표시 안 함 (이미 소유권 이전 기능 있음)
- 탈퇴 후 페이지 리로드 없이 그룹 목록에서 즉시 제거 (낙관적 UI)
- API 실패 시 별도 에러 처리 없음 (현재 다른 destructive action과 동일한 패턴)
