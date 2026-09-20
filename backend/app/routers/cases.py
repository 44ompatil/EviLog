from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas import CaseCreate, CaseResponse
from app.services import ServiceError, create_case, get_case, list_cases

router = APIRouter(prefix="/api", tags=["Cases"])


def _raise_for_service_error(exc: ServiceError) -> None:
    message = str(exc)
    if "already exists" in message.lower():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message) from exc
    if "not found" in message.lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message) from exc


@router.post("/cases", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case_endpoint(payload: CaseCreate) -> CaseResponse:
    try:
        return create_case(payload)
    except ServiceError as exc:
        _raise_for_service_error(exc)


@router.get("/cases", response_model=list[CaseResponse])
def list_cases_endpoint() -> list[CaseResponse]:
    return list_cases()


@router.get("/cases/{case_id}", response_model=CaseResponse)
def get_case_endpoint(case_id: str) -> CaseResponse:
    case = get_case(case_id)
    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case not found: {case_id}",
        )
    return case
