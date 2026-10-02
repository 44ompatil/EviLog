from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.database import get_database
from app.services.face_auth_service import (
    FaceAuthError,
    build_face_embedding_documents,
    has_valid_face_enrollment,
)
from app.schemas import (
    CaseCreate,
    CaseResponse,
    CaseUpdate,
    EvidenceCreate,
    EvidenceResponse,
    EvidenceUpdate,
    OfficerCreate,
    OfficerResponse,
    OfficerUpdate,
    RFIDMappingCreate,
    RFIDMappingResponse,
    RFIDTagCreate,
    RFIDTagResponse,
    SecurityAlertResponse,
    TransactionCreate,
    TransactionResponse,
)


class ServiceError(ValueError):
    """Raised when a requested service operation cannot be completed."""


logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _generated_id(prefix: str) -> str:
    return f"{prefix}-{_now().year}-{uuid4().hex[:8].upper()}"


def _datetime_sort_key(value: datetime | None) -> float:
    if value is None:
        return float("-inf")
    normalized = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    return normalized.timestamp()


def _ensure_unique(collection, field: str, value: str, entity_name: str) -> None:
    existing = collection.find_one({field: value})
    if existing is not None:
        raise ServiceError(f"{entity_name} with {field}={value!r} already exists")


def _require_document(collection, field: str, value: str, entity_name: str):
    document = collection.find_one({field: value})
    if document is None:
        raise ServiceError(f"{entity_name} not found: {value}")
    return document


def _legacy_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _normalize_officer_document(collection, document: dict) -> dict | None:
    """Backfill equivalent legacy field names; never fabricate required values."""
    normalized = dict(document)
    updates: dict[str, object] = {}

    if not normalized.get("badge_number"):
        for legacy_key in ("badgeNumber", "badge_no", "badge"):
            legacy_value = normalized.get(legacy_key)
            if isinstance(legacy_value, str) and legacy_value.strip():
                updates["badge_number"] = legacy_value.strip()
                break

    if not normalized.get("registered_at"):
        registration_time = _legacy_datetime(normalized.get("created_at"))
        if registration_time is not None:
            updates["registered_at"] = registration_time

    officer_id = normalized.get("officer_id")
    if updates and officer_id:
        collection.update_one({"officer_id": officer_id}, {"$set": updates})
        normalized.update(updates)

    required_fields = ("officer_id", "name", "badge_number", "role", "status", "registered_at")
    missing_fields = [field for field in required_fields if not normalized.get(field)]
    if missing_fields:
        logger.warning(
            "Omitting incomplete officer document from API response; missing required fields: %s",
            ", ".join(missing_fields),
        )
        return None
    return normalized


def create_case(data: CaseCreate) -> CaseResponse:
    database = get_database()
    collection = database["cases"]
    document = data.model_dump(mode="python")
    document["case_id"] = document.get("case_id") or _generated_id("CASE")
    document["created_at"] = document.get("created_at") or _now()
    _ensure_unique(collection, "case_id", document["case_id"], "Case")
    collection.insert_one(document)
    return CaseResponse.model_validate(document)


def get_case(case_id: str) -> CaseResponse | None:
    database = get_database()
    document = database["cases"].find_one({"case_id": case_id})
    if document is None:
        return None
    return CaseResponse.model_validate(document)


def list_cases() -> list[CaseResponse]:
    database = get_database()
    documents = database["cases"].find()
    return [CaseResponse.model_validate(document) for document in documents]


def update_case(case_id: str, data: CaseUpdate) -> CaseResponse:
    database = get_database()
    collection = database["cases"]
    _require_document(collection, "case_id", case_id, "Case")
    updates = data.model_dump(mode="python", exclude_unset=True)
    updates.pop("case_id", None)
    updates.pop("created_at", None)
    if updates:
        collection.update_one({"case_id": case_id}, {"$set": updates})
    updated = collection.find_one({"case_id": case_id})
    return CaseResponse.model_validate(updated)


def delete_case(case_id: str) -> None:
    database = get_database()
    _require_document(database["cases"], "case_id", case_id, "Case")
    if database["evidence"].find_one({"case_id": case_id}) is not None:
        raise ServiceError("Case cannot be deleted while evidence is registered to it")
    database["cases"].delete_one({"case_id": case_id})


def create_evidence(data: EvidenceCreate) -> EvidenceResponse:
    database = get_database()
    collection = database["evidence"]
    case_exists = database["cases"].find_one({"case_id": data.case_id})
    if case_exists is None:
        raise ServiceError(f"Case not found: {data.case_id}")
    document = data.model_dump(mode="python")
    document["evidence_id"] = document.get("evidence_id") or _generated_id("EVD")
    document["registered_at"] = document.get("registered_at") or _now()
    _ensure_unique(collection, "evidence_id", document["evidence_id"], "Evidence")
    collection.insert_one(document)
    return EvidenceResponse.model_validate(document)


def get_evidence(evidence_id: str) -> EvidenceResponse | None:
    database = get_database()
    document = database["evidence"].find_one({"evidence_id": evidence_id})
    if document is None:
        return None
    return EvidenceResponse.model_validate(document)


def list_evidence() -> list[EvidenceResponse]:
    database = get_database()
    documents = database["evidence"].find()
    return [EvidenceResponse.model_validate(document) for document in documents]


def update_evidence(evidence_id: str, data: EvidenceUpdate) -> EvidenceResponse:
    database = get_database()
    collection = database["evidence"]
    _require_document(collection, "evidence_id", evidence_id, "Evidence")
    updates = data.model_dump(mode="python", exclude_unset=True)
    updates.pop("evidence_id", None)
    updates.pop("case_id", None)
    updates.pop("registered_at", None)
    if updates:
        collection.update_one({"evidence_id": evidence_id}, {"$set": updates})
    updated = collection.find_one({"evidence_id": evidence_id})
    return EvidenceResponse.model_validate(updated)


def delete_evidence(evidence_id: str) -> None:
    database = get_database()
    _require_document(database["evidence"], "evidence_id", evidence_id, "Evidence")
    for collection_name in ("transactions", "chain_of_custody", "security_alerts"):
        if database[collection_name].find_one({"evidence_id": evidence_id}) is not None:
            raise ServiceError("Evidence cannot be deleted because it has historical records")

    mappings = list(database["rfid_mappings"].find())
    active_mappings = _latest_mappings_by_rfid(mappings)
    for rfid_id, mapping in active_mappings.items():
        if mapping.get("evidence_id") == evidence_id:
            tag = database["rfid_tags"].find_one({"rfid_id": rfid_id})
            if tag and tag.get("status") == "assigned":
                release_rfid_from_evidence(rfid_id, evidence_id)

    database["evidence"].delete_one({"evidence_id": evidence_id})


def create_officer(data: OfficerCreate) -> OfficerResponse:
    database = get_database()
    collection = database["officers"]
    document = data.model_dump(mode="python")
    document["officer_id"] = document.get("officer_id") or _generated_id("OF")
    document["registered_at"] = document.get("registered_at") or _now()
    _ensure_unique(collection, "officer_id", document["officer_id"], "Officer")
    collection.insert_one(document)
    return OfficerResponse.model_validate({**document, "face_enrolled": False})


def create_officer_with_face(
    data: OfficerCreate,
    samples: dict[str, str] | None = None,
) -> OfficerResponse:
    database = get_database()
    collection = database["officers"]
    document = data.model_dump(mode="python", exclude={"face_samples"})
    document["officer_id"] = document.get("officer_id") or _generated_id("OF")
    document["registered_at"] = document.get("registered_at") or _now()
    _ensure_unique(collection, "officer_id", document["officer_id"], "Officer")

    if data.officer_id:
        if samples is not None:
            raise ServiceError("Use the prepared enrollment for this Officer ID")
        if not has_valid_face_enrollment(database["face_embeddings"], document["officer_id"]):
            raise ServiceError("Complete face enrollment before registering this Officer")
        embeddings = None
    else:
        if samples is None:
            raise ServiceError("Face enrollment is required before registering an Officer")
        try:
            embeddings = build_face_embedding_documents(document["officer_id"], samples)
        except FaceAuthError as exc:
            raise ServiceError(str(exc)) from exc

    try:
        collection.insert_one(document)
        if embeddings is not None:
            database["face_embeddings"].insert_many(embeddings)
    except Exception as exc:
        if embeddings is not None:
            database["face_embeddings"].delete_many({"officer_id": document["officer_id"]})
        collection.delete_one({"officer_id": document["officer_id"]})
        raise ServiceError("Officer registration could not be completed. Please try again.") from exc

    return OfficerResponse.model_validate({**document, "face_enrolled": True})


def prepare_officer_face_enrollment(samples: dict[str, str]) -> dict[str, str | bool]:
    database = get_database()
    officers = database["officers"]
    embeddings_collection = database["face_embeddings"]
    officer_id = _generated_id("OF")
    while officers.find_one({"officer_id": officer_id}) or embeddings_collection.find_one({"officer_id": officer_id}):
        officer_id = _generated_id("OF")

    try:
        documents = build_face_embedding_documents(officer_id, samples)
    except FaceAuthError as exc:
        raise ServiceError(str(exc)) from exc

    try:
        embeddings_collection.insert_many(documents)
    except Exception as exc:
        embeddings_collection.delete_many({"officer_id": officer_id})
        raise ServiceError("Face enrollment could not be saved. Please try again.") from exc
    return {"officer_id": officer_id, "enrolled": True}


def cancel_officer_face_enrollment(officer_id: str) -> None:
    database = get_database()
    if database["officers"].find_one({"officer_id": officer_id}) is not None:
        raise ServiceError("Face enrollment already belongs to a registered Officer")
    database["face_embeddings"].delete_many({"officer_id": officer_id})


def get_officer(officer_id: str) -> OfficerResponse | None:
    database = get_database()
    collection = database["officers"]
    document = collection.find_one({"officer_id": officer_id})
    if document is None:
        return None
    document = _normalize_officer_document(collection, document)
    if document is None:
        return None
    enrolled = has_valid_face_enrollment(database["face_embeddings"], officer_id)
    return OfficerResponse.model_validate({**document, "face_enrolled": enrolled})


def list_officers() -> list[OfficerResponse]:
    database = get_database()
    collection = database["officers"]
    officers: list[OfficerResponse] = []
    for document in collection.find():
        normalized = _normalize_officer_document(collection, document)
        if normalized is None:
            continue
        face_enrolled = has_valid_face_enrollment(
            database["face_embeddings"], normalized["officer_id"]
        )
        officers.append(OfficerResponse.model_validate({
            **normalized,
            "face_enrolled": face_enrolled,
        }))
    return officers


def update_officer(officer_id: str, data: OfficerUpdate) -> OfficerResponse:
    database = get_database()
    collection = database["officers"]
    existing = _require_document(collection, "officer_id", officer_id, "Officer")
    updates = data.model_dump(mode="python", exclude_unset=True)
    updates.pop("officer_id", None)
    updates.pop("registered_at", None)
    if updates:
        collection.update_one({"officer_id": officer_id}, {"$set": updates})
    updated = collection.find_one({"officer_id": officer_id}) or existing
    updated = _normalize_officer_document(collection, updated)
    if updated is None:
        raise ServiceError("Officer record is incomplete; a real badge number is required")
    enrolled = has_valid_face_enrollment(database["face_embeddings"], officer_id)
    return OfficerResponse.model_validate({**updated, "face_enrolled": enrolled})


def delete_officer(officer_id: str) -> None:
    database = get_database()
    _require_document(database["officers"], "officer_id", officer_id, "Officer")
    for collection_name in ("transactions", "chain_of_custody", "security_alerts"):
        if database[collection_name].find_one({"officer_id": officer_id}) is not None:
            raise ServiceError("Officer cannot be deleted because historical records reference it")
    database["face_embeddings"].delete_many({"officer_id": officer_id})
    database["officers"].delete_one({"officer_id": officer_id})


def register_rfid_tag(data: RFIDTagCreate) -> RFIDTagResponse:
    database = get_database()
    collection = database["rfid_tags"]
    _ensure_unique(collection, "rfid_id", data.rfid_id, "RFID tag")
    document = data.model_dump(mode="python")
    collection.insert_one(document)
    return RFIDTagResponse.model_validate(document)


def get_rfid_tag(rfid_id: str) -> RFIDTagResponse | None:
    database = get_database()
    document = database["rfid_tags"].find_one({"rfid_id": rfid_id})
    if document is None:
        return None
    return RFIDTagResponse.model_validate(document)


def list_rfid_tags() -> list[RFIDTagResponse]:
    database = get_database()
    documents = database["rfid_tags"].find()
    return [RFIDTagResponse.model_validate(document) for document in documents]


def assign_rfid_to_evidence(rfid_id: str, evidence_id: str, assigned_to: str | None = None) -> RFIDMappingResponse:
    database = get_database()
    rfid_collection = database["rfid_tags"]
    evidence_collection = database["evidence"]
    mapping_collection = database["rfid_mappings"]

    tag_doc = _require_document(rfid_collection, "rfid_id", rfid_id, "RFID tag")
    evidence_doc = _require_document(evidence_collection, "evidence_id", evidence_id, "Evidence")

    if tag_doc.get("status") == "assigned":
        raise ServiceError(f"RFID tag {rfid_id} is already assigned")

    for current_rfid_id, mapping in _latest_mappings_by_rfid(list(mapping_collection.find())).items():
        current_tag = rfid_collection.find_one({"rfid_id": current_rfid_id})
        if mapping.get("evidence_id") == evidence_id and current_tag and current_tag.get("status") == "assigned":
            raise ServiceError(f"Evidence {evidence_id} already has an assigned RFID tag")

    mapping_id = f"mapping-{uuid4().hex[:12]}"
    assignment_target = assigned_to or evidence_id
    mapping_data = RFIDMappingCreate(
        mapping_id=mapping_id,
        rfid_id=rfid_id,
        evidence_id=evidence_id,
        assigned_to=assignment_target,
        assigned_at=_now(),
    )
    mapping_document = mapping_data.model_dump(mode="python")
    mapping_collection.insert_one(mapping_document)

    rfid_collection.update_one({"rfid_id": rfid_id}, {"$set": {"status": "assigned"}})

    return RFIDMappingResponse.model_validate(mapping_document)


def release_rfid_from_evidence(rfid_id: str, evidence_id: str) -> RFIDTagResponse:
    database = get_database()
    rfid_collection = database["rfid_tags"]
    evidence_collection = database["evidence"]

    tag_doc = _require_document(rfid_collection, "rfid_id", rfid_id, "RFID tag")
    _require_document(evidence_collection, "evidence_id", evidence_id, "Evidence")

    current_mapping = _latest_mappings_by_rfid(list(database["rfid_mappings"].find())).get(rfid_id)
    if tag_doc.get("status") == "assigned" and (
        current_mapping is None or current_mapping.get("evidence_id") != evidence_id
    ):
        raise ServiceError(f"RFID tag {rfid_id} is not assigned to evidence {evidence_id}")

    if tag_doc.get("status") == "assigned" and current_mapping is not None:
        database["rfid_mappings"].update_one(
            {"mapping_id": current_mapping["mapping_id"]},
            {"$set": {"released_at": _now()}},
        )

    rfid_collection.update_one({"rfid_id": rfid_id}, {"$set": {"status": "available"}})
    updated_doc = rfid_collection.find_one({"rfid_id": rfid_id})
    if updated_doc is None:
        raise ServiceError(f"RFID tag not found after release: {rfid_id}")
    return RFIDTagResponse.model_validate(updated_doc)


def _latest_mappings_by_rfid(mappings: list[dict]) -> dict[str, dict]:
    latest: dict[str, dict] = {}
    for mapping in mappings:
        rfid_id = mapping.get("rfid_id")
        if not rfid_id:
            continue
        previous = latest.get(rfid_id)
        assigned_at = _datetime_sort_key(mapping.get("assigned_at"))
        previous_at = _datetime_sort_key((previous or {}).get("assigned_at"))
        if previous is None or assigned_at >= previous_at:
            latest[rfid_id] = mapping
    return latest


def list_rfid_mappings() -> list[RFIDMappingResponse]:
    database = get_database()
    return [RFIDMappingResponse.model_validate(item) for item in database["rfid_mappings"].find()]


def list_evidence_custody(evidence_id: str) -> list[dict]:
    database = get_database()
    _require_document(database["evidence"], "evidence_id", evidence_id, "Evidence")
    records = list(database["chain_of_custody"].find({"evidence_id": evidence_id}))
    records.sort(key=lambda item: _datetime_sort_key(item.get("timestamp")))
    result = []
    for record in records:
        officer = database["officers"].find_one({"officer_id": record.get("officer_id")})
        public_record = {key: value for key, value in record.items() if key != "_id"}
        result.append({**public_record, "officer_name": officer.get("name") if officer else None})
    return result


def list_transactions() -> list[TransactionResponse]:
    database = get_database()
    records = list(database["transactions"].find())
    records.sort(key=lambda item: _datetime_sort_key(item.get("timestamp")), reverse=True)
    return [TransactionResponse.model_validate(item) for item in records]


def list_security_alerts() -> list[SecurityAlertResponse]:
    database = get_database()
    records = list(database["security_alerts"].find())
    records.sort(key=lambda item: _datetime_sort_key(item.get("timestamp")), reverse=True)
    return [SecurityAlertResponse.model_validate(item) for item in records]


def mark_security_alert_read(alert_id: str) -> SecurityAlertResponse:
    database = get_database()
    collection = database["security_alerts"]
    _require_document(collection, "alert_id", alert_id, "Security alert")
    collection.update_one({"alert_id": alert_id}, {"$set": {"read": True}})
    return SecurityAlertResponse.model_validate(collection.find_one({"alert_id": alert_id}))


def mark_all_security_alerts_read() -> None:
    database = get_database()
    collection = database["security_alerts"]
    for record in collection.find():
        collection.update_one({"alert_id": record["alert_id"]}, {"$set": {"read": True}})


__all__ = [
    "ServiceError",
    "create_case",
    "get_case",
    "list_cases",
    "update_case",
    "delete_case",
    "create_evidence",
    "get_evidence",
    "list_evidence",
    "update_evidence",
    "delete_evidence",
    "create_officer",
    "get_officer",
    "list_officers",
    "update_officer",
    "delete_officer",
    "register_rfid_tag",
    "get_rfid_tag",
    "list_rfid_tags",
    "assign_rfid_to_evidence",
    "release_rfid_from_evidence",
    "list_rfid_mappings",
    "list_evidence_custody",
    "list_transactions",
    "list_security_alerts",
    "mark_security_alert_read",
    "mark_all_security_alerts_read",
]
