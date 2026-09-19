from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.database import get_database
from app.schemas import (
    ChainOfCustodyCreate,
    ChainOfCustodyResponse,
    SecurityAlertCreate,
    SecurityAlertResponse,
    TransactionCreate,
    TransactionResponse,
)

SUPPORTED_EVENTS = {
    "access",
    "check_in",
    "check_out",
    "transfer",
    "inventory",
    "seal",
    "tamper",
    "scan",
}


class HardwareEventError(ValueError):
    """Raised when a hardware event cannot be processed."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_timestamp(timestamp: datetime | None) -> datetime:
    return timestamp if timestamp is not None else _now()


def _safe_value(value: str | None, fallback: str = "unknown") -> str:
    return value if value and value.strip() else fallback


def validate_hardware_event(
    officer_id: str,
    rfid_id: str,
    event_type: str,
    timestamp: datetime | None = None,
) -> dict[str, str | datetime]:
    database = get_database()

    normalized_action = (event_type or "").strip().lower()
    if normalized_action not in SUPPORTED_EVENTS:
        raise HardwareEventError(f"Unsupported event type: {event_type}")

    officer = database["officers"].find_one({"officer_id": officer_id})
    if officer is None:
        raise HardwareEventError(f"Officer not found: {officer_id}")

    tag = database["rfid_tags"].find_one({"rfid_id": rfid_id})
    if tag is None:
        raise HardwareEventError(f"RFID tag not found: {rfid_id}")

    if tag.get("status") != "assigned":
        raise HardwareEventError(f"RFID tag {rfid_id} is not assigned to evidence")

    mapping = database["rfid_mappings"].find_one({"rfid_id": rfid_id})
    if mapping is None:
        raise HardwareEventError(f"RFID tag {rfid_id} is not assigned to an evidence item")

    evidence_id = mapping.get("evidence_id")
    if not evidence_id:
        raise HardwareEventError(f"RFID tag {rfid_id} is missing evidence assignment")

    evidence = database["evidence"].find_one({"evidence_id": evidence_id})
    if evidence is None:
        raise HardwareEventError(f"Evidence not found: {evidence_id}")

    event_time = _coerce_timestamp(timestamp)
    return {
        "officer_id": officer_id,
        "rfid_id": rfid_id,
        "evidence_id": evidence_id,
        "event_type": normalized_action,
        "timestamp": event_time,
    }


def create_security_alert(
    officer_id: str | None,
    evidence_id: str | None,
    alert_type: str,
    description: str,
    severity: str,
    timestamp: datetime | None = None,
) -> SecurityAlertResponse:
    database = get_database()
    alert_id = f"alert-{uuid4().hex[:12]}"
    alert_document = SecurityAlertCreate(
        alert_id=alert_id,
        officer_id=_safe_value(officer_id),
        evidence_id=_safe_value(evidence_id),
        alert_type=alert_type,
        description=description,
        severity=severity,
        message=description,
        status="open",
        timestamp=_coerce_timestamp(timestamp),
    ).model_dump(mode="python")
    database["security_alerts"].insert_one(alert_document)
    return SecurityAlertResponse.model_validate(alert_document)


def create_transaction_and_custody(
    officer_id: str,
    evidence_id: str,
    event_type: str,
    timestamp: datetime | None = None,
) -> dict[str, object]:
    database = get_database()
    event_time = _coerce_timestamp(timestamp)

    transaction_document = TransactionCreate(
        transaction_id=f"txn-{uuid4().hex[:12]}",
        evidence_id=evidence_id,
        officer_id=officer_id,
        action=event_type,
        timestamp=event_time,
    ).model_dump(mode="python")
    database["transactions"].insert_one(transaction_document)

    custody_document = ChainOfCustodyCreate(
        custody_id=f"custody-{uuid4().hex[:12]}",
        evidence_id=evidence_id,
        transaction_id=transaction_document["transaction_id"],
        officer_id=officer_id,
        action=event_type,
        remarks=f"Hardware event processed for RFID evidence {evidence_id}",
        timestamp=event_time,
    ).model_dump(mode="python")
    database["chain_of_custody"].insert_one(custody_document)

    return {
        "transaction": TransactionResponse.model_validate(transaction_document),
        "chain_of_custody": ChainOfCustodyResponse.model_validate(custody_document),
    }


def process_hardware_event(
    officer_id: str,
    rfid_id: str,
    event_type: str,
    timestamp: datetime | None = None,
) -> dict[str, object]:
    event_time = _coerce_timestamp(timestamp)

    try:
        validated = validate_hardware_event(officer_id, rfid_id, event_type, event_time)
    except HardwareEventError as exc:
        alert = create_security_alert(
            officer_id=officer_id,
            evidence_id=None,
            alert_type="tamper_event",
            description=str(exc),
            severity="high",
            timestamp=event_time,
        )
        return {
            "status": "alert_created",
            "message": str(exc),
            "alert": alert,
        }

    created = create_transaction_and_custody(
        officer_id=str(validated["officer_id"]),
        evidence_id=str(validated["evidence_id"]),
        event_type=str(validated["event_type"]),
        timestamp=event_time,
    )

    return {
        "status": "processed",
        "message": "Hardware event processed successfully",
        "transaction": created["transaction"],
        "chain_of_custody": created["chain_of_custody"],
    }


__all__ = [
    "HardwareEventError",
    "SUPPORTED_EVENTS",
    "validate_hardware_event",
    "create_security_alert",
    "create_transaction_and_custody",
    "process_hardware_event",
]
