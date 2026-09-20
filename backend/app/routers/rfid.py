from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

from app.schemas import RFIDMappingResponse, RFIDTagCreate, RFIDTagResponse
from app.services import (
    ServiceError,
    assign_rfid_to_evidence,
    get_rfid_tag,
    list_rfid_tags,
    register_rfid_tag,
    release_rfid_from_evidence,
)

router = APIRouter(prefix="/api", tags=["RFID"])


class RFIDAssignmentRequest(BaseModel):
    rfid_id: str = Field(..., min_length=1)
    evidence_id: str = Field(..., min_length=1)
    assigned_to: str | None = None


class RFIDReleaseRequest(BaseModel):
    rfid_id: str = Field(..., min_length=1)
    evidence_id: str = Field(..., min_length=1)


def _raise_for_service_error(exc: ServiceError) -> None:
    message = str(exc)
    if "already exists" in message.lower():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message) from exc
    if "already assigned" in message.lower():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message) from exc
    if "not found" in message.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message) from exc


@router.post("/rfid", response_model=RFIDTagResponse, status_code=status.HTTP_201_CREATED)
def create_rfid_tag_endpoint(payload: RFIDTagCreate) -> RFIDTagResponse:
    try:
        return register_rfid_tag(payload)
    except ServiceError as exc:
        _raise_for_service_error(exc)


@router.get("/rfid", response_model=list[RFIDTagResponse])
def list_rfid_tags_endpoint() -> list[RFIDTagResponse]:
    return list_rfid_tags()


@router.get("/rfid/{rfid_id}", response_model=RFIDTagResponse)
def get_rfid_tag_endpoint(rfid_id: str) -> RFIDTagResponse:
    tag = get_rfid_tag(rfid_id)
    if tag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RFID tag not found: {rfid_id}",
        )
    return tag


@router.post("/rfid/assign", response_model=RFIDMappingResponse)
def assign_rfid_endpoint(payload: RFIDAssignmentRequest) -> RFIDMappingResponse:
    try:
        return assign_rfid_to_evidence(
            rfid_id=payload.rfid_id,
            evidence_id=payload.evidence_id,
            assigned_to=payload.assigned_to,
        )
    except ServiceError as exc:
        _raise_for_service_error(exc)


@router.post("/rfid/release", response_model=RFIDTagResponse)
def release_rfid_endpoint(payload: RFIDReleaseRequest) -> RFIDTagResponse:
    try:
        return release_rfid_from_evidence(
            rfid_id=payload.rfid_id,
            evidence_id=payload.evidence_id,
        )
    except ServiceError as exc:
        _raise_for_service_error(exc)
