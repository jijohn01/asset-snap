# CLAUDE.md — Backend

## Stack

- **Framework:** FastAPI + uvicorn
- **DB/Auth:** Supabase Python SDK (`supabase==2.10.0`)
- **Config:** `pydantic-settings` — reads from `backend/.env` (copy `.env.example`)
- **Auth tokens:** `python-jose[cryptography]`
- **Numerics:** `numpy`

## Dev Commands

Run from `backend/`:
- `uvicorn app.main:app --reload` — start dev server (http://localhost:8000)
- Health check: `GET /health`

## API Structure

```
app/
  main.py              # FastAPI app, CORS, router mount at /api
  config.py            # Settings (supabase_url, keys, allowed_origins)
  api/v1/
    router.py          # Aggregates all endpoint routers at /api/v1
    endpoints/         # One file per resource (e.g. snapshots.py)
  models/              # Pydantic request/response models
  services/            # Business logic (e.g. calculations.py)
  db/                  # Supabase client (db/supabase.py)
```

New endpoints: add file to `endpoints/`, register in `api/v1/router.py`.

## Environment

Required vars (see `.env.example`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `ALLOWED_ORIGINS` (default: `http://localhost:3000`)
