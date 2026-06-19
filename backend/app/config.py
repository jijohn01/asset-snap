import json
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    allowed_origins: list[str] = ["http://localhost:3000"]
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""
    supabase_password: str = ""  # psycopg2 직접 연결용 (마이그레이션 스크립트)
    supabase_jwt_secret: str = ""

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [o.strip() for o in v.split(",")]
        return v

    class Config:
        env_file = ".env"


settings = Settings()
