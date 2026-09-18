from __future__ import annotations

from pymongo import MongoClient
from pymongo.database import Database

from app.config import settings

client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
database: Database = client[settings.database_name]


def get_database() -> Database:
    """Return the configured MongoDB database instance."""
    return database
