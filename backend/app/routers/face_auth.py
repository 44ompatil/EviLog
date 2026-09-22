from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.face_auth_service import authenticate_face

router = APIRouter(prefix="/api", tags=["Face Auth"])


class FaceAuthRequest(BaseModel):
    image: str = Field(..., min_length=1)
    threshold: float | None = None


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
