from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
for env_path in (BACKEND_DIR / ".env", BACKEND_DIR.parent / ".env"):
    if env_path.exists():
        load_dotenv(env_path)


@dataclass(frozen=True)
class Settings:
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    database_name: str = os.getenv("DATABASE_NAME", "evilog")


settings = Settings()
