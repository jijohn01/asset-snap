# CLAUDE.md — Backend

## 스택

- **프레임워크:** FastAPI + uvicorn
- **패키지 매니저:** `uv` — 패키지 추가는 `uv add <패키지>`, 의존성 설치는 `uv sync`
- **설정:** `pydantic-settings` — `backend/.env` 파일에서 읽음 (`.env.example` 복사해서 생성)
- **DB:** Supabase (PostgreSQL) — `db/supabase.py` (CRUD 함수), `local_store.py` 미사용

## 개발 명령어

`backend/` 디렉터리에서 실행:
- `uv sync` — 초기 환경 설정 / 의존성 설치
- `uv run uvicorn app.main:app --reload` — 개발 서버 시작 (http://localhost:8000)
- 또는 루트에서 `scripts/dev.ps1` — 프론트엔드 + 백엔드 동시 실행 (별도 터미널)
- 헬스 체크: `GET /health`

## API 구조

```
app/
  main.py              # FastAPI 앱, CORS 설정, /api에 라우터 마운트
  config.py            # 설정값 (Supabase URL/key 포함)
  api/v1/
    router.py          # /api/v1의 모든 엔드포인트 라우터 집계
    deps.py            # JWT 검증 (get_current_user dependency)
    endpoints/
      asset_groups.py  # 장부 CRUD + 멤버 관리
      snapshots.py     # 스냅샷 CRUD (장부 하위 리소스)
  models/
    snapshot.py        # SnapshotItem, SnapshotCreate, SnapshotResponse
    asset_group.py     # AssetGroupCreate/Response, MemberResponse 등
  services/
    calculations.py    # 재무 지표 계산 (JSONB flat 구조 기반)
  db/
    supabase.py        # CRUD 함수 (groups, members, snapshots)
scripts/
  migrate_json.py      # JSON 파일 → Supabase 1회성 마이그레이션
supabase/
  migrations/001_init.sql  # 4개 테이블 DDL + RLS + trigger + VIEW
```

새 엔드포인트 추가: `endpoints/`에 파일 생성 후 `api/v1/router.py`에 등록.

## 엔드포인트 목록

```
GET    /api/v1/asset-groups/                              내 장부 목록
POST   /api/v1/asset-groups/                              장부 생성
GET    /api/v1/asset-groups/{group_id}                    장부 상세
PUT    /api/v1/asset-groups/{group_id}                    장부 수정 (owner)
DELETE /api/v1/asset-groups/{group_id}                    장부 삭제 (owner)

GET    /api/v1/asset-groups/{group_id}/members            멤버 목록
POST   /api/v1/asset-groups/{group_id}/members            멤버 초대 (owner)
PUT    /api/v1/asset-groups/{group_id}/members/{user_id}  역할 변경 (owner)
DELETE /api/v1/asset-groups/{group_id}/members/{user_id}  멤버 제거 (owner)

GET    /api/v1/asset-groups/{group_id}/snapshots/         스냅샷 목록 (최신순)
POST   /api/v1/asset-groups/{group_id}/snapshots/         스냅샷 생성/수정 (upsert)
GET    /api/v1/asset-groups/{group_id}/snapshots/prefill  직전 스냅샷 초기값 (amount=0)
GET    /api/v1/asset-groups/{group_id}/snapshots/{id}     스냅샷 단건
PUT    /api/v1/asset-groups/{group_id}/snapshots/{id}     스냅샷 수정
DELETE /api/v1/asset-groups/{group_id}/snapshots/{id}     스냅샷 삭제

GET    /health                                            헬스 체크
```

**주의:** `POST /snapshots/`는 동일 `snapshot_month`가 이미 존재하면 upsert. ID가 아닌 월 기준.

**인증:** `Authorization: Bearer <JWT>` 헤더. `api/deps.py`의 `get_current_user`가 Supabase ES256 공개키로 검증 후 `sub` (user UUID) 반환.
- Supabase 신규 프로젝트는 HS256이 아닌 **ES256** 사용 — JWKS 공개키로 검증 (`PyJWT[crypto]` 필요)
- JWKS URL: `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`

## 환경 변수

`backend/.env.example` 참고:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
ALLOWED_ORIGINS=["http://localhost:3000"]
```

**⚠️ Gotcha:** `ALLOWED_ORIGINS`는 반드시 **JSON 배열 문자열** 형식이어야 함 (pydantic-settings v2.6.1 이상). 쉼표 구분 문자열 불가.

**⚠️ Gotcha:** `.env` 파일은 gitignored라 워크트리 생성 시 자동 복사 안 됨 — 수동으로 복사 후 `uv sync` 실행.

## 데이터 모델 (JSONB)

```json
{
  "<item-uuid>": {
    "label":      "CMA",
    "category":   "assets.cash_savings",
    "sort_order": 0,
    "memo":       "",
    "amount":     4097
  }
}
```

- category 형식: `{section}.{subcategory}` (e.g. `assets.cash_savings`, `expenses.fixed_consumption`)
- item_id는 앱 레이어에서 생성한 UUID, 스냅샷 간 복사해 연속성 유지
- 해당 달에 없는 항목은 키 자체가 없음
