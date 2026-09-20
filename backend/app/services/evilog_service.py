from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.database import get_database
from app.schemas import (
    CaseCreate,
    CaseResponse,
    EvidenceCreate,
    EvidenceResponse,
    OfficerCreate,
    OfficerResponse,
    RFIDMappingCreate,
    RFIDMappingResponse,
    RFIDTagCreate,
    RFIDTagResponse,
    TransactionCreate,
    TransactionResponse,
)


class ServiceError(ValueError):
    """Raised when a requested service operation cannot be completed."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_unique(collection, field: str, value: str, entity_name: str) -> None:
    existing = collection.find_one({field: value})
    if existing is not None:
        raise ServiceError(f"{entity_name} with {field}={value!r} already exists")


def _require_document(collection, field: str, value: str, entity_name: str):
    document = collection.find_one({field: value})
    if document is None:
        raise ServiceError(f"{entity_name} not found: {value}")
    return document


def create_case(data: CaseCreate) -> CaseResponse:
    database = get_database()
    collection = database["cases"]
    _ensure_unique(collection, "case_id", data.case_id, "Case")
    document = data.model_dump(mode="python")
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


def create_evidence(data: EvidenceCreate) -> EvidenceResponse:
    database = get_database()
    collection = database["evidence"]
    _ensure_unique(collection, "evidence_id", data.evidence_id, "Evidence")
    case_exists = database["cases"].find_one({"case_id": data.case_id})
    if case_exists is None:
        raise ServiceError(f"Case not found: {data.case_id}")
    document = data.model_dump(mode="python")
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


def create_officer(data: OfficerCreate) -> OfficerResponse:
    database = get_database()
    collection = database["officers"]
    _ensure_unique(collection, "officer_id", data.officer_id, "Officer")
    document = data.model_dump(mode="python")
    collection.insert_one(document)
    return OfficerResponse.model_validate(document)


def get_officer(officer_id: str) -> OfficerResponse | None:
    database = get_database()
    document = database["officers"].find_one({"officer_id": officer_id})
    if document is None:
        return None
    return OfficerResponse.model_validate(document)


def list_officers() -> list[OfficerResponse]:
    database = get_database()
    documents = database["officers"].find()
    return [OfficerResponse.model_validate(document) for document in documents]


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

    rfid_collection.update_one({"rfid_id": rfid_id}, {"$set": {"status": "available"}})
    updated_doc = rfid_collection.find_one({"rfid_id": rfid_id})
    if updated_doc is None:
        raise ServiceError(f"RFID tag not found after release: {rfid_id}")
    return RFIDTagResponse.model_validate(updated_doc)


__all__ = [
    "ServiceError",
    "create_case",
    "get_case",
    "list_cases",
    "create_evidence",
    "get_evidence",
    "list_evidence",
    "create_officer",
    "get_officer",
    "list_officers",
    "register_rfid_tag",
    "get_rfid_tag",
    "list_rfid_tags",
    "assign_rfid_to_evidence",
    "release_rfid_from_evidence",
]
