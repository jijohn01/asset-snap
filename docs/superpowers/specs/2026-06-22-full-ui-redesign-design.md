# Full UI Redesign — Toss Design System

**Date:** 2026-06-22  
**Branch:** feat/design-group-ux  
**Scope:** 전체 앱 UI 재디자인. 기능 변경 없음. DESIGN.md(Toss 디자인 시스템) 기반.

---

## 1. 결정 사항

| 항목 | 결정 |
|---|---|
| 네비게이션 | 사이드바 제거 → 상단 바 |
| 그룹 전환기 위치 | 상단 바 왼쪽 (로고 옆) |
| 콘텐츠 최대 너비 | `max-w-5xl` (데스크탑 우선) |
| 로그인/회원가입 | 미니멀 센터드, 흰 배경 |
| 모바일 | 현재 스코프 외 (추후) |

---

## 2. 디자인 토큰 변경

`globals.css` `@theme` 블록 업데이트:

| 토큰 | 현재 | 변경 후 (TDS 정확 값) |
|---|---|---|
| ink | `#111111` | `#191f28` |
| ink-sub | `#6B6B6B` | `#6b7684` |
| surface | `#F5F5F7` | `#f2f4f6` |
| border | `#E4E4E7` | `#e5e8eb` |
| positive | `#00B493` | `#03b26c` |
| primary-50 | `#EBF4FF` | `#e8f3ff` |

카드: `border border-[#E4E4E7]` → `shadow-[0_2px_8px_rgba(0,0,0,0.08)]`

---

## 3. 레이아웃 — 상단 네비게이션 바

**파일:** `frontend/src/components/layout/Topbar.tsx` (신규)  
**파일:** `frontend/src/app/(app)/layout.tsx` (수정 — Sidebar → Topbar)

```
┌──────────────────────────────────────────────────────────────┐
│  [GET]blue[DON]dark  │  [장부 드롭다운 ▾]  │  대시보드  이력  설정  [로그아웃] │
└──────────────────────────────────────────────────────────────┘
```

- 배경: `#ffffff`, 하단 `1px solid #e5e8eb`
- 높이: `56px` (TDS touch target 기준)
- 로고: 컬러 스플릿 워드마크 — `GET` `#3182F6` / `DON` `#191f28`, 18px/700 (→ [GETDON 브랜딩 스펙](2026-06-24-getdon-branding-design.md))
- 장부 드롭다운: 현재 Sidebar의 GroupSwitcher 로직 그대로 이전. "새 장부 만들기" 포함.
- 네비게이션 링크: active = `#3182f6` 텍스트 + 하단 2px blue 밑줄. inactive = `#8b95a1`
- 로그아웃: 맨 오른쪽, `#8b95a1` 텍스트

콘텐츠 영역: `max-w-5xl mx-auto px-6 py-8`

---

## 4. 대시보드 (`/`)

**파일:** `frontend/src/app/(app)/page.tsx` (수정)

- 순자산 히어로: shadow 카드, 순자산 숫자 `30px/700` (TDS display-hero)
- 보조 지표 3개: 동일 shadow 카드, 숫자 `22px/700`
- 장부 컨텍스트 배지: TDS Weak/Blue 뱃지 (이미 구현됨)
- 차트 카드: shadow 기반
- 색상: `#191f28`, `#8b95a1`, `#e5e8eb` 토큰으로 통일

---

## 5. 월별 이력 (`/history`)

**파일:** `frontend/src/app/(app)/history/page.tsx` (수정)

현재 파일 확인 필요. 예상:
- 테이블/목록 행: hover `#f2f4f6`
- 증감 뱃지: TDS Weak 스타일 (`rgba(3,178,108,0.15)` / `rgba(240,68,82,0.15)`)
- 카드 shadow 적용

---

## 6. 스냅샷 입력/수정

**파일:** `frontend/src/components/SnapshotForm.tsx` (수정)

- 입력 필드: TDS box 스타일 (`rgba(0,23,51,0.02)` bg, 14px radius)
- 버튼: TDS primary fill (16px radius, 56px 높이 대신 medium 38px로 폼에 맞게)
- 레이블, 보조 텍스트: TDS 색상 토큰

---

## 7. 로그인 / 회원가입

**파일:** `frontend/src/app/login/page.tsx`, `signup/page.tsx` (수정)

- 전체 배경: `#f2f4f6`
- 중앙 카드: `bg-white`, `rounded-2xl`, `shadow-[0_2px_8px_rgba(0,0,0,0.08)]`, `p-8`, `max-w-sm`
- 로고/앱명: 카드 상단
- 입력: TDS box 스타일
- CTA 버튼: TDS primary fill, full-width, `min-h-[48px]`

---

## 8. 설정 (`/settings`)

**파일:** `frontend/src/app/(app)/settings/page.tsx`

이미 이번 브랜치에서 완성:
- Shadow 카드
- 역할별 왼쪽 테두리 액센트
- 비아코디언 멤버 목록
- TDS 색상 토큰

변경 없음.

---

## 9. 구현 순서

1. `globals.css` 토큰 업데이트
2. `Topbar.tsx` 신규 작성 (GroupSwitcher 로직 이전)
3. `layout.tsx` Sidebar → Topbar 교체
4. `Sidebar.tsx` 삭제
5. 대시보드 카드 스타일 업데이트
6. 이력 페이지 스타일 업데이트
7. SnapshotForm 스타일 업데이트
8. 로그인/회원가입 스타일 업데이트

---

## 10. 불변 사항

- 모든 API 호출 / 상태 관리 로직: 변경 없음
- Supabase auth 흐름: 변경 없음
- `middleware.ts`: 변경 없음
- 라우팅 구조: 변경 없음
- recharts 차트 데이터 로직: 변경 없음
