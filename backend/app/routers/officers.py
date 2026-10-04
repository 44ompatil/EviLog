from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from app.schemas import OfficerCreate, OfficerFaceRegistrationCreate, OfficerResponse, OfficerUpdate
from app.services import ServiceError, create_officer_with_face, delete_officer, get_officer, list_officers, update_officer

router = APIRouter(prefix="/api", tags=["Officers"])


def _raise_for_service_error(exc: ServiceError) -> None:
    message = str(exc)
    if "already exists" in message.lower() or "cannot be deleted" in message.lower():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message) from exc
    if "not found" in message.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message) from exc


@router.post("/officers", response_model=OfficerResponse, status_code=status.HTTP_201_CREATED)
def create_officer_endpoint(payload: OfficerFaceRegistrationCreate) -> OfficerResponse:
    try:
        return create_officer_with_face(
            OfficerCreate(
                officer_id=payload.officer_id,
                name=payload.name,
                badge_number=payload.badge_number,
                role=payload.role,
                status=payload.status,
            ),
            payload.face_samples,
        )
    except ServiceError as exc:
        _raise_for_service_error(exc)


@router.get("/officers", response_model=list[OfficerResponse])
def list_officers_endpoint() -> list[OfficerResponse]:
    return list_officers()


@router.get("/officers/{officer_id}", response_model=OfficerResponse)
def get_officer_endpoint(officer_id: str) -> OfficerResponse:
    officer = get_officer(officer_id)
    if officer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Officer not found: {officer_id}",
        )
    return officer


@router.put("/officers/{officer_id}", response_model=OfficerResponse)
def update_officer_endpoint(officer_id: str, payload: OfficerUpdate) -> OfficerResponse:
    try:
        return update_officer(officer_id, payload)
    except ServiceError as exc:
        _raise_for_service_error(exc)


@router.delete("/officers/{officer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_officer_endpoint(officer_id: str) -> Response:
    try:
        delete_officer(officer_id)
    except ServiceError as exc:
        _raise_for_service_error(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
