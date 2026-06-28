# GETDON 브랜딩 — 로고 & 서비스명 변경

**Date:** 2026-06-24  
**Scope:** 서비스명 "모으다" → "GETDON" 변경 + 워드마크 스타일 적용. 색상/레이아웃/기능 변경 없음.

---

## 1. 브랜드 결정 사항

| 항목 | 결정 |
|---|---|
| 서비스명 | GETDON |
| 로고 방식 | 컬러 스플릿 워드마크 (심볼 없음) |
| 색상 테마 | 기존 블루 팔레트 유지 (`#3182F6`) |
| 폰트 | Pretendard Variable (변경 없음) |

**GETDON 네이밍 의미:**
- Get + 돈(money) — 자산을 얻는다
- 곗돈 연상 — 한국 전통 공동 저축 문화, 그룹 장부 기능과 연결

---

## 2. 워드마크 스펙

```
[GET]blue  [DON]dark
```

| 파트 | 색상 | Tailwind |
|---|---|---|
| `GET` | `#3182F6` | `text-primary-500` |
| `DON` | `#191f28` | `text-ink` |

- 폰트 웨이트: `font-bold` (700)
- 자간: 기본값 (letter-spacing 별도 조정 없음)
- 케이스: 항상 대문자 (`GETDON`)

**구현 패턴:**
```tsx
<span className="font-bold text-primary-500">GET</span>
<span className="font-bold text-ink">DON</span>
```

---

## 3. 변경 파일

### 3-1. Topbar (`frontend/src/components/layout/Topbar.tsx`)

현재:
```tsx
<Link href="/" className="text-base font-semibold text-[#191f28] ...">
  모으다
</Link>
```

변경 후:
```tsx
<Link href="/" className="text-lg hover:opacity-75 transition-opacity shrink-0">
  <span className="font-bold text-primary-500">GET</span>
  <span className="font-bold text-ink">DON</span>
</Link>
```

- `text-base` → `text-lg` (로고 존재감 강화)
- `text-[#191f28]` 제거 (각 span에 색상 분리 적용)

### 3-2. 로그인 (`frontend/src/app/login/page.tsx`)

현재:
```tsx
<h1 className="text-[22px] font-bold text-[#191f28] tracking-tight">모으다</h1>
<p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
```

변경 후:
```tsx
<h1 className="text-3xl">
  <span className="font-bold text-primary-500">GET</span>
  <span className="font-bold text-ink">DON</span>
</h1>
<p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
```

- 크기: `text-[22px]` → `text-3xl` (로그인 화면에서 더 강조)
- `tracking-tight` 제거

### 3-3. 회원가입 (`frontend/src/app/signup/page.tsx`)

로그인 페이지와 동일한 패턴 적용.

### 3-4. 메타데이터 (`frontend/src/app/layout.tsx`)

```tsx
export const metadata: Metadata = {
  title: "GETDON",
  description: "나와 우리의 자산을 한눈에",
};
```

---

## 4. 불변 사항

- 색상 팔레트: `globals.css` 변경 없음
- 레이아웃/라우팅: 변경 없음
- 기능/API: 변경 없음
- 차트/데이터 로직: 변경 없음
