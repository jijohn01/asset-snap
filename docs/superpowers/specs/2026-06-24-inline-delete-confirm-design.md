# 스냅샷 삭제 확인 인라인 UI 교체 (Issue #37)

## 문제

`history/page.tsx`의 `handleDelete()`가 `window.confirm()`을 사용 중.
- 디자인 시스템과 동떨어진 브라우저 네이티브 다이얼로그
- 삭제 버튼이 항상 노출되어 실수 클릭 위험

## 해결 방향

삭제 버튼 클릭 시 해당 행 우측에 인라인으로 "[삭제] [취소]" 버튼을 표시한다.

## 상태 설계

```ts
const [confirmingId, setConfirmingId] = useState<string | null>(null);
// 기존 deletingId 유지
```

- `confirmingId`: 삭제 확인 대기 중인 스냅샷 id
- `deletingId`: API 호출 중인 스냅샷 id (기존)

두 상태는 독립적으로 동작. 한 행이 confirm 상태일 때 다른 행의 삭제 아이콘을 누르면 `confirmingId`가 새 id로 교체된다.

## 행별 렌더링

| 상태 | 우측 UI |
|------|---------|
| 기본 | `[보기/수정]` `[🗑 삭제]` |
| `confirmingId === id` | `정말 삭제할까요?` `[삭제]` `[취소]` |
| `deletingId === id` | 두 버튼 모두 disabled |

## 흐름

1. 🗑 삭제 버튼 클릭 → `setConfirmingId(id)`
2. [취소] 클릭 → `setConfirmingId(null)`
3. [삭제] 클릭 → `setConfirmingId(null)` + `setDeletingId(id)` + API 호출 → 성공 시 목록에서 제거 → `setDeletingId(null)`

## 변경 범위

- `frontend/src/app/(app)/history/page.tsx` 단독 수정
- 새 컴포넌트 없음
- `window.confirm()` 제거

## 스타일

기존 디자인 시스템 색상 사용:
- [삭제] 버튼: 기존 삭제 버튼 스타일 (`bg-[rgba(240,68,82,0.08)] text-[#f04452]`)
- [취소] 버튼: 기존 보기/수정 버튼 스타일 (`bg-[#f2f4f6] text-[#4e5968]`)
- 확인 텍스트: `text-xs text-[#4e5968]`
