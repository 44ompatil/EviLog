from __future__ import annotations

from typing import Any

from pymongo import ASCENDING, MongoClient
from pymongo.database import Database

from app.config import settings

client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=5000, tz_aware=True)
database: Database = client[settings.database_name]

COLLECTIONS = (
    "officers",
    "cases",
    "evidence",
    "rfid_tags",
    "rfid_mappings",
    "security_alerts",
    "transactions",
    "chain_of_custody",
)

INDEX_DEFINITIONS: dict[str, list[tuple[str | tuple[str, int], dict[str, Any]]]] = {
    "officers": [
        ("officer_id", {"unique": True, "name": "unique_officer_id"}),
        ("badge_number", {"name": "idx_officer_badge_number"}),
        ("status", {"name": "idx_officer_status"}),
    ],
    "cases": [
        ("case_id", {"unique": True, "name": "unique_case_id"}),
        ("fir_number", {"name": "idx_case_fir_number"}),
        ("status", {"name": "idx_case_status"}),
        ("created_at", {"name": "idx_case_created_at"}),
    ],
    "evidence": [
        ("evidence_id", {"unique": True, "name": "unique_evidence_id"}),
        ("case_id", {"name": "idx_evidence_case_id"}),
        ("status", {"name": "idx_evidence_status"}),
        ("evidence_type", {"name": "idx_evidence_type"}),
    ],
    "rfid_tags": [
        ("rfid_id", {"unique": True, "name": "unique_rfid_id"}),
        ("status", {"name": "idx_rfid_tag_status"}),
        ("registered_at", {"name": "idx_rfid_tag_registered_at"}),
    ],
    "rfid_mappings": [
        ("mapping_id", {"unique": True, "name": "unique_mapping_id"}),
        (("rfid_id", ASCENDING), {"name": "idx_rfid_mapping_rfid_id"}),
        (("evidence_id", ASCENDING), {"name": "idx_rfid_mapping_evidence_id"}),
        (("assigned_to", ASCENDING), {"name": "idx_rfid_mapping_assigned_to"}),
    ],
    "security_alerts": [
        ("alert_id", {"unique": True, "name": "unique_alert_id"}),
        ("evidence_id", {"name": "idx_security_alert_evidence_id"}),
        ("officer_id", {"name": "idx_security_alert_officer_id"}),
        ("status", {"name": "idx_security_alert_status"}),
        ("timestamp", {"name": "idx_security_alert_timestamp"}),
    ],
    "transactions": [
        ("transaction_id", {"unique": True, "name": "unique_transaction_id"}),
        ("evidence_id", {"name": "idx_transaction_evidence_id"}),
        ("officer_id", {"name": "idx_transaction_officer_id"}),
        ("timestamp", {"name": "idx_transaction_timestamp"}),
    ],
    "chain_of_custody": [
        ("custody_id", {"unique": True, "name": "unique_custody_id"}),
        ("evidence_id", {"name": "idx_custody_evidence_id"}),
        ("transaction_id", {"name": "idx_custody_transaction_id"}),
        ("officer_id", {"name": "idx_custody_officer_id"}),
        ("timestamp", {"name": "idx_custody_timestamp"}),
    ],
}


def get_database() -> Database:
    """Return the configured MongoDB database instance."""
    return database


def initialize_database() -> dict[str, Any]:
    """Create the required collections and indexes for the EviLog data model."""
    client.admin.command("ping")

    existing_collections = set(database.list_collection_names())
    for collection_name in COLLECTIONS:
        if collection_name not in existing_collections:
            database.create_collection(collection_name)
            existing_collections.add(collection_name)

    for collection_name, index_specs in INDEX_DEFINITIONS.items():
        collection = database[collection_name]
        index_info = collection.index_information()
        for field, options in index_specs:
            if isinstance(field, tuple):
                key = [field]
            else:
                key = [(field, ASCENDING)]

            index_name = options.get("name")
            if index_name not in index_info:
                collection.create_index(key, **options)

    return {
        "database": settings.database_name,
        "collections": sorted(database.list_collection_names()),
        "status": "initialized",
    }


def verify_database() -> dict[str, Any]:
    """Verify that MongoDB is reachable and the expected collections/indexes exist."""
    client.admin.command("ping")

    collections = set(database.list_collection_names())
    missing_collections = [name for name in COLLECTIONS if name not in collections]
    if missing_collections:
        raise RuntimeError(f"Missing collections: {missing_collections}")

    missing_indexes: list[str] = []
    for collection_name, index_specs in INDEX_DEFINITIONS.items():
        collection = database[collection_name]
        index_info = collection.index_information()
        for field, options in index_specs:
            index_name = options.get("name")
            if index_name is not None and index_name not in index_info:
                missing_indexes.append(f"{collection_name}.{index_name}")

    if missing_indexes:
        raise RuntimeError(f"Missing indexes: {missing_indexes}")

    return {
        "database": settings.database_name,
        "collections": sorted(collections),
        "verified_indexes": sum(
            len(index_specs) for index_specs in INDEX_DEFINITIONS.values()
        ),
        "status": "verified",
    }
