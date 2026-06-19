from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    allowed_origins: list[str] = ["http://localhost:3000"]
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
