from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.services.face_auth_service import FaceAuthError, authenticate_face, enroll_face_samples
from app.services import ServiceError, cancel_officer_face_enrollment, prepare_officer_face_enrollment

router = APIRouter(prefix="/api", tags=["Face Auth"])


class FaceAuthRequest(BaseModel):
    image: str = Field(..., min_length=1)
    threshold: float | None = None


class FaceEnrollmentRequest(BaseModel):
    officer_id: str = Field(..., min_length=1)
    samples: dict[str, str]


class FaceEnrollmentPreparationRequest(BaseModel):
    samples: dict[str, str]


@router.post("/face-auth/recognize")
def recognize_face_endpoint(payload: FaceAuthRequest) -> dict[str, object]:
    try:
        return authenticate_face(payload.image, threshold=payload.threshold)
    except Exception:
        return {
            "authenticated": False,
            "officer_id": None,
            "similarity": 0.0,
            "confidence": 0.0,
            "quality_score": 0.0,
            "message": "Face not recognized.",
        }


@router.post("/face-auth/enroll", status_code=status.HTTP_201_CREATED)
def enroll_face_endpoint(payload: FaceEnrollmentRequest) -> dict[str, object]:
    try:
        return enroll_face_samples(payload.officer_id, payload.samples)
    except FaceAuthError as exc:
        status_code = status.HTTP_404_NOT_FOUND if "not found" in str(exc).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc


@router.post("/face-auth/prepare-enrollment", status_code=status.HTTP_201_CREATED)
def prepare_face_enrollment_endpoint(payload: FaceEnrollmentPreparationRequest) -> dict[str, object]:
    try:
        return prepare_officer_face_enrollment(payload.samples)
    except ServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/face-auth/enrollment/{officer_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_face_enrollment_endpoint(officer_id: str) -> Response:
    try:
        cancel_officer_face_enrollment(officer_id)
    except ServiceError as exc:
        status_code = status.HTTP_409_CONFLICT if "already belongs" in str(exc).lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
