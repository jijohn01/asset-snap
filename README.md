# Asset Snap

> 매일 쓰는 귀찮은 가계부는 끝났다. 한 달에 한 번, 내 자산의 위치를 스냅샷으로 찍고 미래를 항해하는 네비게이터

기존 가계부 앱이 **과거 지출 반성**에 집중한다면, Asset Snap은 **현재 자산 체급 파악**과 **미래 시뮬레이션**에 집중합니다.

## 핵심 기능

- **월간 스냅샷** — 계좌별 잔액만 입력하면 5분 만에 자산 현황 완성
- **커스텀 항목** — 카테고리는 고정, 항목(계좌명 등)은 사람마다 자유롭게 구성
- **핵심 지표 자동 산출** — 순자산, 자기자본비율, 가계수지지표, 비상예비자금지표 등
- **대시보드 & 차트** — 순자산 트렌드, 자산 구성 도넛, 소득/지출 바 차트
- **What-If 시뮬레이션** _(예정)_ — 저축률 변경 시 10년 후 순자산 실시간 예측

## 기술 스택

| 레이어 | 기술 |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI, Python 3.12+, uv |
| DB | Supabase (PostgreSQL) — 개발 중 Local JSON Mock 사용 |

## 시작하기

### 사전 조건

- Node.js 20+
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (`powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`)

### 설치

```powershell
# 백엔드 의존성
cd backend
uv sync

# 프론트엔드 의존성
cd ../frontend
npm install
```

### 실행

```powershell
# 프로젝트 루트에서 — 백엔드 + 프론트엔드 동시 실행
.\scripts\dev.ps1
```

| 서비스 | URL |
|---|---|
| 프론트엔드 | http://localhost:3000 |
| 백엔드 API | http://localhost:8000 |
| API 문서 (Swagger) | http://localhost:8000/docs |

### 환경변수

`frontend/.env.local` 생성:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> 현재 백엔드는 Supabase 없이 로컬 JSON(`backend/data/`)으로 동작합니다.

## 프로젝트 구조

```
asset-snap/
├── frontend/          # Next.js 15
│   └── src/
│       ├── app/       # 라우트 (대시보드, 스냅샷 입력, 이력)
│       └── components/
├── backend/           # FastAPI
│   ├── app/
│   │   ├── api/v1/    # /snapshots, /user-items 엔드포인트
│   │   ├── models/    # Pydantic 모델
│   │   ├── services/  # 지표 계산 로직
│   │   └── db/        # local_store.py (현재) / supabase.py (예정)
│   └── data/          # 개발용 JSON 시드 데이터
├── docs/              # 기획서
└── scripts/           # dev.ps1 실행 스크립트
```

## 개발 현황

- [x] FastAPI 백엔드 + 커스텀 항목 구조 (A안)
- [x] Local JSON Mock 데이터 레이어
- [x] Next.js 레이아웃 + 사이드바
- [ ] 스냅샷 입력 폼 (4단계)
- [ ] 대시보드 차트 연동
- [ ] 월별 이력 페이지
- [ ] Supabase 연동 + 인증
