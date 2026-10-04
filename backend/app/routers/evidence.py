from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from app.schemas import EvidenceCreate, EvidenceResponse, EvidenceUpdate
from app.services import (
    ServiceError,
    create_evidence,
    delete_evidence,
    get_evidence,
    list_evidence,
    list_evidence_custody,
    update_evidence,
)

router = APIRouter(prefix="/api", tags=["Evidence"])


def _raise_for_service_error(exc: ServiceError) -> None:
    message = str(exc)
    if "already exists" in message.lower() or "cannot be deleted" in message.lower():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message) from exc
    if "not found" in message.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message) from exc


@router.post("/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
def create_evidence_endpoint(payload: EvidenceCreate) -> EvidenceResponse:
    try:
        return create_evidence(payload)
    except ServiceError as exc:
        _raise_for_service_error(exc)


@router.get("/evidence", response_model=list[EvidenceResponse])
def list_evidence_endpoint() -> list[EvidenceResponse]:
    return list_evidence()


@router.get("/evidence/{evidence_id}", response_model=EvidenceResponse)
def get_evidence_endpoint(evidence_id: str) -> EvidenceResponse:
    evidence = get_evidence(evidence_id)
    if evidence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence not found: {evidence_id}",
        )
    return evidence


@router.put("/evidence/{evidence_id}", response_model=EvidenceResponse)
def update_evidence_endpoint(evidence_id: str, payload: EvidenceUpdate) -> EvidenceResponse:
    try:
        return update_evidence(evidence_id, payload)
    except ServiceError as exc:
        _raise_for_service_error(exc)


@router.delete("/evidence/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidence_endpoint(evidence_id: str) -> Response:
    try:
        delete_evidence(evidence_id)
    except ServiceError as exc:
        _raise_for_service_error(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/evidence/{evidence_id}/custody")
def get_evidence_custody_endpoint(evidence_id: str) -> list[dict]:
    try:
        return list_evidence_custody(evidence_id)
    except ServiceError as exc:
        _raise_for_service_error(exc)
