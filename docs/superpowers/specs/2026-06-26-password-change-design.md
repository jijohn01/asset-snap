# 비밀번호 변경 기능 설계

**이슈:** #63
**날짜:** 2026-06-26

## 개요

설정 페이지에 "계정 보안" 섹션을 추가해 이메일/비밀번호 가입 사용자가 비밀번호를 변경할 수 있도록 한다. OAuth 사용자(소셜 로그인)에게는 섹션을 노출하지 않는다.

## 파일 구조

| 작업 | 파일 |
|------|------|
| 신규 생성 | `frontend/src/components/settings/PasswordChangeSection.tsx` |
| 수정 | `frontend/src/app/(app)/settings/page.tsx` |

## PasswordChangeSection.tsx

### Props

```ts
{ email: string }
```

`supabase.auth.signInWithPassword`에 현재 사용자 이메일이 필요하므로 부모에서 주입.

### 상태

```ts
currentPassword: string
newPassword: string
confirmPassword: string
loading: boolean
error: string
success: boolean
```

### 제출 흐름

1. **클라이언트 검증**
   - 새 비밀번호 8자 미만 → 인라인 에러
   - 새 비밀번호 ≠ 확인 비밀번호 → 인라인 에러
2. **현재 비밀번호 검증** — `supabase.auth.signInWithPassword({ email, password: currentPassword })`
   - 실패 시 → `error = "현재 비밀번호가 올바르지 않습니다"`
3. **비밀번호 변경** — `supabase.auth.updateUser({ password: newPassword })`
4. **다른 세션 로그아웃** — `supabase.auth.signOut({ scope: 'others' })`
5. **성공 처리** — 폼 초기화 + `success = true` 2초 후 `false`로 리셋

### UI 구조

```
[섹션 헤더: 계정 보안]
현재 비밀번호  [input type=password]
새 비밀번호    [input type=password]
새 비밀번호 확인 [input type=password]
[에러 메시지 — 인라인, #f04452]
[변경 버튼] [성공 시 "변경됨" 텍스트, #03b26c]
```

## settings/page.tsx 수정

### OAuth 감지

`init()` 내에서:

```ts
const identities = data.user?.identities ?? [];
const hasEmailAuth = identities.some(i => i.provider === 'email');
```

### 신규 상태

```ts
userEmail: string | null   // 초기값 null
hasEmailAuth: boolean      // 초기값 false
```

### 렌더링

프로필 섹션과 내 장부 섹션 사이에 삽입:

```tsx
{hasEmailAuth && userEmail && (
  <PasswordChangeSection email={userEmail} />
)}
```

## 스타일 가이드

기존 settings/page.tsx 패턴을 그대로 따름:

- **섹션 헤더:** `text-xs font-semibold uppercase tracking-widest text-[#8b95a1] border-b border-[#e5e8eb] pb-2`
- **input:** `rounded-[14px] bg-[rgba(0,23,51,0.02)] border border-[rgba(2,32,71,0.05)] px-4 py-3 text-sm outline-none focus:border-[#3182f6] transition-colors`
- **버튼:** `rounded-2xl bg-[#3182f6] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2272eb] disabled:opacity-40`
- **에러:** `text-xs text-[#f04452]`
- **성공:** `text-xs text-[#03b26c]`

## 에러 케이스

| 상황 | 메시지 |
|------|--------|
| 새 비밀번호 8자 미만 | 비밀번호는 8자 이상이어야 합니다 |
| 새 비밀번호 불일치 | 비밀번호가 일치하지 않습니다 |
| 현재 비밀번호 불일치 | 현재 비밀번호가 올바르지 않습니다 |
| Supabase 기타 오류 | Supabase 반환 에러 메시지 그대로 표시 |

## 범위 제외

- 비밀번호 표시/숨김 토글 (눈 아이콘)
- 비밀번호 강도 미터
- 백엔드 API 호출 없음 — Supabase Auth 직접 사용
