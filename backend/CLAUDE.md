# CLAUDE.md — Backend

## 스택

- **프레임워크:** FastAPI + uvicorn
- **패키지 매니저:** `uv` — 패키지 추가는 `uv add <패키지>`, 의존성 설치는 `uv sync`
- **설정:** `pydantic-settings` — `backend/.env` 파일에서 읽음 (`.env.example` 복사해서 생성)
- **DB (현재):** `local_store.py` (JSON 파일, `backend/data/`) — 현재 활성 데이터 레이어
- **DB (예정):** Supabase — `db/supabase.py`에 클라이언트 존재, 아직 연동 전

## 개발 명령어

`backend/` 디렉터리에서 실행:
- `uv run uvicorn app.main:app --reload` — 개발 서버 시작 (http://localhost:8000)
- 또는 루트에서 `scripts/dev.ps1` — 프론트엔드 + 백엔드 동시 실행 (별도 터미널)
- 헬스 체크: `GET /health`

## API 구조

```
app/
  main.py              # FastAPI 앱, CORS 설정, /api에 라우터 마운트
  config.py            # 설정값 (allowed_origins만 사용, Supabase 연동 전)
  api/v1/
    router.py          # /api/v1의 모든 엔드포인트 라우터 집계
    endpoints/         # 리소스별 파일 (snapshots.py, user_items.py)
  models/              # Pydantic 요청/응답 모델
  services/            # 비즈니스 로직 (e.g. calculations.py)
  db/                  # local_store.py (활성), supabase.py (향후 연동)
data/                  # JSON 개발 데이터: snapshots.json, user_items.json
```

새 엔드포인트 추가: `endpoints/`에 파일 생성 후 `api/v1/router.py`에 등록.

## 엔드포인트 목록

```
GET    /api/v1/snapshots/          목록 (최신순)
POST   /api/v1/snapshots/          생성 (같은 snapshot_month면 upsert)
GET    /api/v1/snapshots/{id}      단건 조회
PUT    /api/v1/snapshots/{id}      수정
DELETE /api/v1/snapshots/{id}      삭제

GET    /api/v1/user-items/         항목 목록
POST   /api/v1/user-items/         항목 생성
PUT    /api/v1/user-items/{id}     항목 수정
DELETE /api/v1/user-items/{id}     항목 삭제
```

**주의:** `POST /snapshots/`는 동일 `snapshot_month`가 이미 존재하면 덮어씀 (upsert). ID가 아닌 월 기준.

## 환경 변수

현재 필수 변수 없음 (local JSON mock 사용 중).
Supabase 연동 시 `backend/.env.example` 참고.
