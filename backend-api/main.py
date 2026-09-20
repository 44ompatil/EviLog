import os
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient, DESCENDING

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "evidencevault")
API_KEY = os.getenv("API_KEY", "EV-ESP32-2026")

client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
db = client[MONGO_DB]
evidence_col = db.evidence
users_col = db.users
hardware_col = db.hardware_events

app = FastAPI(title="EvidenceVault API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HardwareEvent(BaseModel):
    event_type: str = Field(..., examples=["EVIDENCE_SCAN"])
    rfid_uid: Optional[str] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    door_status: Optional[str] = None
    evidence_id: Optional[str] = None
    officer_name: Optional[str] = None
    location: Optional[str] = "Evidence Locker"
    message: Optional[str] = None
    timestamp: Optional[datetime] = None

class Evidence(BaseModel):
    evidence_id: str
    rfid_uid: str
    evidence_type: str
    description: str = ""
    current_handler: str = "Unassigned"
    storage_location: str = "Locker A-01"
    status: str = "IN STORAGE"

@app.get("/api/health")
def health():
    try:
        client.admin.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "ok", "database": "disconnected"}

@app.get("/api/dashboard")
def dashboard():
    latest_env = hardware_col.find_one(
        {"$or": [{"temperature": {"$ne": None}}, {"humidity": {"$ne": None}}]},
        sort=[("timestamp", DESCENDING)],
    )
    latest = hardware_col.find_one(sort=[("timestamp", DESCENDING)])
    recent = list(hardware_col.find({}, {"_id": 0}).sort("timestamp", DESCENDING).limit(12))
    total_evidence = evidence_col.count_documents({})
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    scans_today = hardware_col.count_documents({"event_type": {"$in": ["EVIDENCE_SCAN", "OFFICER_SCAN"]}, "timestamp": {"$gte": today_start}})
    unauthorized = hardware_col.count_documents({"event_type": "UNAUTHORIZED_ACCESS", "timestamp": {"$gte": today_start}})
    return {
        "total_evidence": total_evidence,
        "scans_today": scans_today,
        "unauthorized_today": unauthorized,
        "temperature": latest_env.get("temperature") if latest_env else None,
        "humidity": latest_env.get("humidity") if latest_env else None,
        "door_status": latest.get("door_status") if latest else "Unknown",
        "last_event_at": latest.get("timestamp") if latest else None,
        "recent_events": recent,
    }

@app.get("/api/evidence/{rfid_uid}")
def get_evidence(rfid_uid: str):
    item = evidence_col.find_one({"rfid_uid": rfid_uid}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Evidence not found for this RFID")
    return item

@app.get("/api/hardware/events")
def hardware_events(limit: int = 20):
    limit = max(1, min(limit, 100))
    return list(hardware_col.find({}, {"_id": 0}).sort("timestamp", DESCENDING).limit(limit))

@app.post("/api/hardware/event")
def receive_hardware(event: HardwareEvent, x_api_key: Optional[str] = Header(default=None)):
    if x_api_key != API_KEY:
        raise HTTPException(401, "Invalid API key")
    now = event.timestamp or datetime.now(timezone.utc)
    data = event.model_dump()
    data["timestamp"] = now
    data["rfid_uid"] = (data.get("rfid_uid") or "").upper()

    if data["event_type"] == "EVIDENCE_SCAN" and data["rfid_uid"]:
        ev = evidence_col.find_one({"rfid_uid": data["rfid_uid"]}, {"_id": 0})
        if ev:
            data["evidence_id"] = ev["evidence_id"]
            data["message"] = f"Evidence {ev['evidence_id']} scanned"
        else:
            data["message"] = "Unknown RFID scanned"
    elif data["event_type"] == "UNAUTHORIZED_ACCESS":
        data["message"] = data.get("message") or "Unauthorized access detected"
    elif data["event_type"] == "DOOR_OPEN":
        data["door_status"] = "OPEN"
    elif data["event_type"] == "DOOR_CLOSE":
        data["door_status"] = "CLOSED"

    hardware_col.insert_one(data)
    return {"success": True, "message": data.get("message", "Event stored"), "timestamp": now}

@app.post("/api/evidence")
def add_evidence(item: Evidence):
    if evidence_col.find_one({"$or": [{"evidence_id": item.evidence_id}, {"rfid_uid": item.rfid_uid.upper()}]}):
        raise HTTPException(409, "Evidence ID or RFID already exists")
    data = item.model_dump()
    data["rfid_uid"] = data["rfid_uid"].upper()
    evidence_col.insert_one(data)
    return {"success": True, "evidence": data}

@app.post("/api/demo/seed")
def seed_demo():
    if evidence_col.count_documents({}) == 0:
        evidence_col.insert_many([
            {"evidence_id": "EV-001", "rfid_uid": "A1B2C3D4", "evidence_type": "Mobile Phone", "description": "Sealed mobile phone", "current_handler": "Officer A", "storage_location": "Locker A-01", "status": "IN STORAGE"},
            {"evidence_id": "EV-002", "rfid_uid": "11223344", "evidence_type": "Document", "description": "Case document packet", "current_handler": "Officer B", "storage_location": "Locker A-02", "status": "IN STORAGE"},
        ])
    now = datetime.now(timezone.utc)
    hardware_col.insert_many([
        {"event_type": "OFFICER_SCAN", "rfid_uid": "A1B2C3D4", "officer_name": "Officer A", "location": "Evidence Locker", "message": "Officer authenticated", "timestamp": now},
        {"event_type": "EVIDENCE_SCAN", "rfid_uid": "A1B2C3D4", "evidence_id": "EV-001", "temperature": 24.6, "humidity": 58.0, "door_status": "CLOSED", "message": "Evidence EV-001 scanned", "timestamp": now},
        {"event_type": "DOOR_CLOSE", "door_status": "CLOSED", "temperature": 24.6, "humidity": 58.0, "message": "Locker closed", "timestamp": now},
    ])
    return {"success": True}
