from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas import SecurityAlertResponse, TransactionResponse
from app.services import (
    ServiceError,
    list_security_alerts,
    list_transactions,
    mark_all_security_alerts_read,
    mark_security_alert_read,
)

router = APIRouter(prefix="/api", tags=["Alerts and Activity"])


def _raise_for_service_error(exc: ServiceError) -> None:
    message = str(exc)
    code = status.HTTP_404_NOT_FOUND if "not found" in message.lower() else status.HTTP_400_BAD_REQUEST
    raise HTTPException(status_code=code, detail=message) from exc


@router.get("/alerts", response_model=list[SecurityAlertResponse])
def list_alerts_endpoint() -> list[SecurityAlertResponse]:
    return list_security_alerts()


@router.patch("/alerts/{alert_id}/read", response_model=SecurityAlertResponse)
def mark_alert_read_endpoint(alert_id: str) -> SecurityAlertResponse:
    try:
        return mark_security_alert_read(alert_id)
    except ServiceError as exc:
        _raise_for_service_error(exc)


@router.post("/alerts/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_alerts_read_endpoint() -> None:
    mark_all_security_alerts_read()


@router.get("/transactions", response_model=list[TransactionResponse])
def list_transactions_endpoint() -> list[TransactionResponse]:
    return list_transactions()
