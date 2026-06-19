"""Supabase DB에 마이그레이션 SQL을 직접 적용하는 1회성 스크립트."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from app.config import settings

PROJECT_REF = settings.supabase_url.replace("https://", "").replace(".supabase.co", "")

conn = psycopg2.connect(
    host=f"db.{PROJECT_REF}.supabase.co",
    port=5432,
    dbname="postgres",
    user="postgres",
    password=settings.supabase_password if hasattr(settings, "supabase_password") else None,
    sslmode="require",
)
conn.autocommit = True
cur = conn.cursor()

sql_path = Path(__file__).parent.parent.parent / "supabase" / "migrations" / "001_init.sql"
print(f"Applying: {sql_path}")
cur.execute(sql_path.read_text(encoding="utf-8"))
print("Migration applied successfully!\n")

cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
""")
print("Tables:", [r[0] for r in cur.fetchall()])

cur.close()
conn.close()
