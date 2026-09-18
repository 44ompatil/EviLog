from __future__ import annotations

import logging

from fastapi import FastAPI

from app.database import initialize_database, verify_database

logger = logging.getLogger("evilog")
app = FastAPI(title="EviLog API", version="0.1.0")


@app.on_event("startup")
def startup_db() -> None:
    try:
        initialize_database()
        verify_database()
    except Exception as exc:  # pragma: no cover - startup validation should not crash the app
        logger.warning("MongoDB startup validation failed: %s", exc)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "EviLog API is running."}


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "evilog-api"}
