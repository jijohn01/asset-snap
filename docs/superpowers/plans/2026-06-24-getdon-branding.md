# GETDON 브랜딩 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서비스명 "모으다"를 "GETDON" 컬러 스플릿 워드마크로 교체한다 — `GET`(#3182f6 파랑) + `DON`(#191f28 검정).

**Architecture:** 텍스트 교체 + span 두 개로 색상 분리. 새 컴포넌트/파일 없음. 색상은 기존 Tailwind 토큰(`text-primary-500`, `text-ink`) 재사용.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4, Pretendard Variable

## Global Constraints

- 변경 파일 4개만 수정 (`Topbar.tsx`, `login/page.tsx`, `signup/page.tsx`, `app/layout.tsx`)
- 색상 팔레트/레이아웃/기능/API 변경 없음
- `GET` = `text-primary-500` (#3182f6), `DON` = `text-ink` (#191f28), 항상 `font-bold`
- 케이스: 항상 대문자 GETDON (소문자 금지)
- 워크트리에서 작업 (`../AssetNavigator-feat-getdon-branding`)

---

### Task 1: 워크트리 생성

**Files:**
- (없음 — git 작업만)

- [ ] **Step 1: 워크트리 생성 및 이동**

```bash
git worktree add ../AssetNavigator-feat-getdon-branding -b feat/getdon-branding
cd ../AssetNavigator-feat-getdon-branding/frontend
npm install
```

- [ ] **Step 2: 변경 전 "모으다" 출현 위치 확인**

```bash
grep -rn "모으다" ../AssetNavigator-feat-getdon-branding/frontend/src
```

Expected output — 정확히 4줄:
```
src/app/(app)/layout.tsx  (없음)
src/app/layout.tsx:5:  title: "모으다",
src/app/login/page.tsx:37:  <h1 ...>모으다</h1>
src/app/signup/page.tsx:65:  <h1 ...>모으다</h1>
src/components/layout/Topbar.tsx:71:  모으다
```

---

### Task 2: Topbar 워드마크 교체

**Files:**
- Modify: `frontend/src/components/layout/Topbar.tsx:67-72`

**Interfaces:**
- Produces: `<Link>` 안에 `GET`(파랑) + `DON`(검정) span 두 개

- [ ] **Step 1: Topbar.tsx 수정**

`frontend/src/components/layout/Topbar.tsx` 라인 67-72:

기존:
```tsx
<Link
  href="/"
  className="text-base font-semibold text-[#191f28] hover:opacity-75 transition-opacity shrink-0"
>
  모으다
</Link>
```

변경 후:
```tsx
<Link
  href="/"
  className="text-lg hover:opacity-75 transition-opacity shrink-0"
>
  <span className="font-bold text-primary-500">GET</span>
  <span className="font-bold text-ink">DON</span>
</Link>
```

- [ ] **Step 2: 변경 확인**

```bash
grep -n "모으다\|GETDON\|primary-500" frontend/src/components/layout/Topbar.tsx
```

Expected: "모으다" 없음, "GETDON" 또는 "primary-500" 있음.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/components/layout/Topbar.tsx
git commit -m "feat: Topbar 로고 GETDON 워드마크로 교체"
```

---

### Task 3: 로그인 페이지 워드마크 교체

**Files:**
- Modify: `frontend/src/app/login/page.tsx:35-38`

**Interfaces:**
- Produces: 로그인 페이지 상단에 `text-3xl` GETDON 워드마크

- [ ] **Step 1: login/page.tsx 수정**

`frontend/src/app/login/page.tsx` 라인 35-38:

기존:
```tsx
<div className="mb-8 text-center">
  <h1 className="text-[22px] font-bold text-[#191f28] tracking-tight">모으다</h1>
  <p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
</div>
```

변경 후:
```tsx
<div className="mb-8 text-center">
  <h1 className="text-3xl">
    <span className="font-bold text-primary-500">GET</span>
    <span className="font-bold text-ink">DON</span>
  </h1>
  <p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
</div>
```

- [ ] **Step 2: 변경 확인**

```bash
grep -n "모으다\|GETDON\|primary-500\|text-3xl" frontend/src/app/login/page.tsx
```

Expected: "모으다" 없음, "primary-500"·"text-3xl" 있음.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/app/login/page.tsx
git commit -m "feat: 로그인 페이지 로고 GETDON 워드마크로 교체"
```

---

### Task 4: 회원가입 페이지 워드마크 교체

**Files:**
- Modify: `frontend/src/app/signup/page.tsx:64-67`

**Interfaces:**
- Produces: 회원가입 페이지 상단에 `text-3xl` GETDON 워드마크 (로그인과 동일 패턴)

- [ ] **Step 1: signup/page.tsx 수정**

`frontend/src/app/signup/page.tsx` 라인 64-67:

기존:
```tsx
<div className="mb-8 text-center">
  <h1 className="text-[22px] font-bold text-[#191f28] tracking-tight">모으다</h1>
  <p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
</div>
```

변경 후:
```tsx
<div className="mb-8 text-center">
  <h1 className="text-3xl">
    <span className="font-bold text-primary-500">GET</span>
    <span className="font-bold text-ink">DON</span>
  </h1>
  <p className="mt-1.5 text-sm text-[#8b95a1]">나의 자산을 한눈에</p>
</div>
```

- [ ] **Step 2: 변경 확인**

```bash
grep -n "모으다\|primary-500\|text-3xl" frontend/src/app/signup/page.tsx
```

Expected: "모으다" 없음, "primary-500"·"text-3xl" 있음.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/app/signup/page.tsx
git commit -m "feat: 회원가입 페이지 로고 GETDON 워드마크로 교체"
```

---

### Task 5: 메타데이터 업데이트

**Files:**
- Modify: `frontend/src/app/layout.tsx:4-7`

**Interfaces:**
- Produces: 브라우저 탭 타이틀 "GETDON", description 업데이트

- [ ] **Step 1: app/layout.tsx 수정**

`frontend/src/app/layout.tsx` 라인 4-7:

기존:
```tsx
export const metadata: Metadata = {
  title: "모으다",
  description: "월간 자산 스냅샷 네비게이터",
};
```

변경 후:
```tsx
export const metadata: Metadata = {
  title: "GETDON",
  description: "나와 우리의 자산을 한눈에",
};
```

- [ ] **Step 2: 변경 확인**

```bash
grep -n "모으다\|GETDON" frontend/src/app/layout.tsx
```

Expected: "모으다" 없음, "GETDON" 있음.

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat: 메타데이터 타이틀 GETDON으로 업데이트"
```

---

### Task 6: 전체 검증 및 PR

**Files:**
- (없음 — 검증 및 git 작업만)

- [ ] **Step 1: "모으다" 잔존 여부 전체 확인**

```bash
grep -rn "모으다" frontend/src --include="*.tsx" --include="*.ts"
```

Expected: **0줄** (결과 없음).

- [ ] **Step 2: dev 서버 실행 후 시각 확인**

```powershell
cd ../AssetNavigator-feat-getdon-branding
.\scripts\dev.ps1
```

브라우저에서 확인:
- `http://localhost:3000/login` → 상단에 `GET`(파랑) `DON`(검정) 워드마크, 브라우저 탭 "GETDON"
- `http://localhost:3000/signup` → 동일
- 로그인 후 대시보드 → Topbar 좌측에 `GET`(파랑) `DON`(검정), `text-lg`

- [ ] **Step 3: PR 생성**

```bash
git push -u origin feat/getdon-branding
gh pr create \
  --title "feat: 서비스명 GETDON 워드마크 적용" \
  --body "## Summary
- 서비스명 \"모으다\" → \"GETDON\" 컬러 스플릿 워드마크로 교체
- GET(#3182f6 파랑) + DON(#191f28 검정), font-bold
- 변경 파일: Topbar.tsx, login/page.tsx, signup/page.tsx, app/layout.tsx

## Test plan
- [ ] /login 페이지: GETDON 워드마크 표시, 브라우저 탭 타이틀 \"GETDON\"
- [ ] /signup 페이지: GETDON 워드마크 표시
- [ ] 대시보드 Topbar: GETDON 워드마크 표시
- [ ] 전체 코드베이스에 \"모으다\" 잔존 없음"
```
