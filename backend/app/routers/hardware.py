from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.event_processing_service import process_hardware_event

router = APIRouter(prefix="/api", tags=["Hardware"])


class HardwareEventRequest(BaseModel):
    officer_id: str = Field(..., min_length=1)
    rfid_id: str = Field(..., min_length=1)
    event_type: str = Field(..., min_length=1)
    timestamp: datetime | None = None


@router.post("/hardware/events")
def process_hardware_event_endpoint(payload: HardwareEventRequest):
    result = process_hardware_event(
        officer_id=payload.officer_id,
        rfid_id=payload.rfid_id,
        event_type=payload.event_type,
        timestamp=payload.timestamp,
    )

    if result["status"] == "alert_created":
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "status": result["status"],
                "message": result["message"],
                "alert": result["alert"].model_dump(mode="json"),
            },
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": result["status"],
            "message": result["message"],
            "transaction": result["transaction"].model_dump(mode="json"),
            "chain_of_custody": result["chain_of_custody"].model_dump(mode="json"),
        },
    )
