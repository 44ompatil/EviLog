from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class EviLogBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class OfficerBase(EviLogBaseModel):
    officer_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    badge_number: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    registered_at: datetime


class OfficerCreate(OfficerBase):
    officer_id: str | None = Field(default=None, min_length=1)
    registered_at: datetime | None = None


class OfficerFaceRegistrationCreate(EviLogBaseModel):
    officer_id: str | None = Field(default=None, min_length=1)
    name: str = Field(..., min_length=1)
    badge_number: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    face_samples: dict[str, str] | None = None


class OfficerUpdate(EviLogBaseModel):
    officer_id: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    badge_number: str | None = Field(default=None, min_length=1)
    role: str | None = Field(default=None, min_length=1)
    status: str | None = Field(default=None, min_length=1)
    registered_at: datetime | None = None


class OfficerResponse(OfficerBase):
    face_enrolled: bool = False


class CaseBase(EviLogBaseModel):
    case_id: str = Field(..., min_length=1)
    fir_number: str = Field(..., min_length=1)
    case_title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    case_type: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    created_at: datetime


class CaseCreate(CaseBase):
    case_id: str | None = Field(default=None, min_length=1)
    created_at: datetime | None = None


class CaseUpdate(EviLogBaseModel):
    case_id: str | None = Field(default=None, min_length=1)
    fir_number: str | None = Field(default=None, min_length=1)
    case_title: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, min_length=1)
    case_type: str | None = Field(default=None, min_length=1)
    status: str | None = Field(default=None, min_length=1)
    created_at: datetime | None = None


class CaseResponse(CaseBase):
    pass


class EvidenceBase(EviLogBaseModel):
    evidence_id: str = Field(..., min_length=1)
    case_id: str = Field(..., min_length=1)
    evidence_name: str = Field(..., min_length=1)
    evidence_type: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    registered_at: datetime


class EvidenceCreate(EvidenceBase):
    evidence_id: str | None = Field(default=None, min_length=1)
    registered_at: datetime | None = None


class EvidenceUpdate(EviLogBaseModel):
    evidence_id: str | None = Field(default=None, min_length=1)
    case_id: str | None = Field(default=None, min_length=1)
    evidence_name: str | None = Field(default=None, min_length=1)
    evidence_type: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, min_length=1)
    status: str | None = Field(default=None, min_length=1)
    registered_at: datetime | None = None


class EvidenceResponse(EvidenceBase):
    pass


class RFIDTagBase(EviLogBaseModel):
    rfid_id: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    registered_at: datetime


class RFIDTagCreate(RFIDTagBase):
    pass


class RFIDTagUpdate(EviLogBaseModel):
    rfid_id: str | None = Field(default=None, min_length=1)
    status: str | None = Field(default=None, min_length=1)
    registered_at: datetime | None = None


class RFIDTagResponse(RFIDTagBase):
    pass


class RFIDMappingBase(EviLogBaseModel):
    mapping_id: str = Field(..., min_length=1)
    rfid_id: str = Field(..., min_length=1)
    evidence_id: str = Field(..., min_length=1)
    assigned_to: str = Field(..., min_length=1)
    assigned_at: datetime
    released_at: datetime | None = None


class RFIDMappingCreate(RFIDMappingBase):
    pass


class RFIDMappingUpdate(EviLogBaseModel):
    mapping_id: str | None = Field(default=None, min_length=1)
    rfid_id: str | None = Field(default=None, min_length=1)
    evidence_id: str | None = Field(default=None, min_length=1)
    assigned_to: str | None = Field(default=None, min_length=1)
    assigned_at: datetime | None = None
    released_at: datetime | None = None


class RFIDMappingResponse(RFIDMappingBase):
    pass


class SecurityAlertBase(EviLogBaseModel):
    alert_id: str = Field(..., min_length=1)
    officer_id: str = Field(..., min_length=1)
    evidence_id: str = Field(..., min_length=1)
    alert_type: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    severity: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    timestamp: datetime
    read: bool = False


class SecurityAlertCreate(SecurityAlertBase):
    pass


class SecurityAlertUpdate(EviLogBaseModel):
    alert_id: str | None = Field(default=None, min_length=1)
    officer_id: str | None = Field(default=None, min_length=1)
    evidence_id: str | None = Field(default=None, min_length=1)
    alert_type: str | None = Field(default=None, min_length=1)
    description: str | None = Field(default=None, min_length=1)
    severity: str | None = Field(default=None, min_length=1)
    message: str | None = Field(default=None, min_length=1)
    status: str | None = Field(default=None, min_length=1)
    timestamp: datetime | None = None


class SecurityAlertResponse(SecurityAlertBase):
    pass


class TransactionBase(EviLogBaseModel):
    transaction_id: str = Field(..., min_length=1)
    evidence_id: str = Field(..., min_length=1)
    officer_id: str = Field(..., min_length=1)
    action: str = Field(..., min_length=1)
    timestamp: datetime


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(EviLogBaseModel):
    transaction_id: str | None = Field(default=None, min_length=1)
    evidence_id: str | None = Field(default=None, min_length=1)
    officer_id: str | None = Field(default=None, min_length=1)
    action: str | None = Field(default=None, min_length=1)
    timestamp: datetime | None = None


class TransactionResponse(TransactionBase):
    pass


class ChainOfCustodyBase(EviLogBaseModel):
    custody_id: str = Field(..., min_length=1)
    evidence_id: str = Field(..., min_length=1)
    transaction_id: str = Field(..., min_length=1)
    officer_id: str = Field(..., min_length=1)
    action: str = Field(..., min_length=1)
    remarks: str = Field(..., min_length=1)
    timestamp: datetime


class ChainOfCustodyCreate(ChainOfCustodyBase):
    pass


class ChainOfCustodyUpdate(EviLogBaseModel):
    custody_id: str | None = Field(default=None, min_length=1)
    evidence_id: str | None = Field(default=None, min_length=1)
    transaction_id: str | None = Field(default=None, min_length=1)
    officer_id: str | None = Field(default=None, min_length=1)
    action: str | None = Field(default=None, min_length=1)
    remarks: str | None = Field(default=None, min_length=1)
    timestamp: datetime | None = None


class ChainOfCustodyResponse(ChainOfCustodyBase):
    pass
