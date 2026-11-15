# EviLog Hardware — Real-Time Integration Plan

**Version:** 1.0  
**Date:** November 2026  
**Project:** EviLog Evidence Tracking System  
**Scope:** Integrating ESP32 hardware firmware with FastAPI backend + React frontend

---

## 🗺️ Integration Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        LAPTOP                                   │
│                                                                  │
│  ┌─────────────────┐      ┌──────────────────────────────────┐ │
│  │  React Frontend  │◄────►│  FastAPI Backend                 │ │
│  │  (Vite, port     │      │  (Uvicorn, port 8000)            │ │
│  │   5173)          │      │  MongoDB ← evidence, officers,   │ │
│  │                  │      │  rfid_tags, rfid_mappings,       │ │
│  │  - Dashboard     │      │  transactions, chain_of_custody, │ │
│  │  - Evidence Mgmt │      │  security_alerts                 │ │
│  │  - Officers      │      │                                  │ │
│  │  - Alerts        │      │  POST /api/hardware/events ◄─────┼─┼── ESP32
│  │  - RFID Mgmt     │      │  GET  /api/rfid                  │ │
│  └─────────────────┘      │  GET  /api/health                │ │
│                             └──────────────────────────────────┘ │
│                                      ▲                           │
│  ┌──────────────────────────────────┐│                          │
│  │  Face Recognition Module          ││                          │
│  │  (OpenCV + face_recognition lib) ││                          │
│  │  - POST /api/face/authenticate ──┘│                          │
│  │  - Runs on LAPTOP camera          │                          │
│  └──────────────────────────────────┘                           │
└────────────────────────────────────────────────────────────────┘
              │
              │ WiFi (HTTP)
              │
┌─────────────▼──────────────────────────────────────────────────┐
│                   ESP32 DevKit V1 (Hardware Unit)               │
│                                                                  │
│  MFRC522 RFID ────────────► Firmware ──► HTTP POST /api/hardware/events │
│  SG90 Servo                                                      │
│  LCD 16×2                                                        │
│  Active Buzzer                                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## 📋 Integration Phases

### Phase 1 — Hardware Prototype
**Status:** ✅ Implemented in `src/main.cpp`  
**Goal:** Verify the MFRC522 reader, servo, LCD,
buzzer, and indicators.

**What works:**
- RFID scans send the card UID through the normal backend authorization flow
- An allowed backend response unlocks the servo; denied/offline scans stay locked
- LCD displays status
- Buzzer sounds on deny

**How to test:**
1. Configure WiFi/backend and register the card UID as both officer and RFID ID
2. Flash the default RFID firmware with `pio run -t upload`
3. Open Serial Monitor (`pio device monitor`) and tap the RFID card

---

### Phase 2 — WiFi + Backend Event Streaming
**Status:** ✅ Implemented in `src/main.cpp` + `lib/EviLogHW/BackendClient`  
**Goal:** ESP32 sends events to FastAPI backend; backend manages access decisions.

**Setup steps:**
1. Start the backend:
   ```powershell
   cd d:\Projects\EviLog\backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   The default firmware environment is `esp32dev`. The scanned card UID is used
   for backend validation.
2. Register at least one officer in MongoDB:
   ```http
   POST http://localhost:8000/api/officers
   {
     "officer_id": "A1:B2:C3:D4",   ← Match the UID printed by the ESP32
     "name": "Officer Singh",
     "badge_number": "PB-001",
     "role": "Inspector",
     "status": "active"
   }
   ```
3. Register RFID tag:
   ```http
   POST http://localhost:8000/api/rfid
   {
     "rfid_id": "A1:B2:C3:D4",
     "status": "available",
     "registered_at": "2026-11-11T00:00:00Z"
   }
   ```
4. Create a case and evidence item, then assign RFID:
   ```http
   POST http://localhost:8000/api/rfid/assign
   {
     "rfid_id": "DE:AD:BE:EF",
     "evidence_id": "EVD-2026-XXXX"
   }
   ```
5. Set `BACKEND_HOST` in `config.h` to laptop's WiFi IP address.
6. Flash firmware with `pio run -t upload` → tap the RFID card → backend
   validation determines whether the servo opens.

**Data flow:**
```
ESP32 RFID card scan
  → POST /api/hardware/events {officer_id, rfid_id, event_type, timestamp}
  → Backend: validate officer + rfid + mapping
  → 200 "processed": ALLOWED → servo unlock
  → 400 "alert_created": DENIED → buzzer alarm
  → Backend writes: Transaction + ChainOfCustody records to MongoDB
```

**Backend officer_id mapping strategy:**
The scanned card UID is sent as the `officer_id`; register that UID as the officer
ID and RFID ID in the backend.

**Future alternative (Phase 3+):** Pull officer-to-RFID mapping from backend before validation.

---

### Phase 3 — Backend-Driven RFID Whitelist (Pull-Based)
**Status:** 🔲 Planned  
**Goal:** ESP32 periodically fetches the list of registered RFIDs from backend and caches it locally.

**New endpoint needed in backend:**
```http
GET /api/rfid?status=assigned
→ [{"rfid_id": "A1:B2:C3:D4", "status": "assigned"}, ...]
```

**ESP32 changes:**
1. On boot and every 60 seconds, `GET /api/rfid` → download JSON
2. Parse JSON → store UIDs in a `std::set<String>` cache
3. On card scan: local lookup FIRST (fast), then POST to backend
4. If card in local whitelist AND backend reachable → both must pass
5. If backend unreachable but card in whitelist → allow (online-whitelist mode)

**Benefits:**
- Sub-100ms local lookup (no HTTP latency on deny)
- Works with brief WiFi interruptions
- Fail-open option for authorized cards (configurable)

**Implementation in `BackendClient`:**
```cpp
bool BackendClient::fetchRFIDWhitelist(std::set<String>& whitelist);
```

---

### Phase 4 — Camera Face Verification (Laptop-Side)
**Status:** 🔲 Planned  
**Goal:** Add a second authentication factor (face recognition) on the laptop for high-security access.

**Architecture:**
```
ESP32 scans RFID → HTTP POST to backend
  → Backend returns {status: "processed", officer_id: "OF-2026-XXXX"}
  → Backend also signals frontend via WebSocket or polling
  → Frontend triggers face verification workflow on laptop camera
  → Face auth result sent to backend → chain-of-custody updated
```

**Frontend integration point:**
- `frontend/src/services/rfid.js` already exists
- Add WebSocket client in frontend to receive real-time scan events
- Trigger face auth UI when scan event received

**Backend changes needed:**
- Add WebSocket endpoint: `GET /api/ws/events` (or use Server-Sent Events)
- Frontend subscribes → gets pushed scan events in real-time
- Officer UI shows "Face verification required" prompt

**Face auth flow (from `backend/app/face_auth.py`):**
```
Laptop camera → POST /api/face/authenticate {officer_id, image_base64}
  → face_inference_service.py → compare embeddings
  → 200 match / 401 no match
  → Frontend shows result, backend records verification
```

---

### Phase 5 — Full System Integration
**Status:** 🔲 Planned  
**Goal:** End-to-end: RFID scan → backend validate → face verify → servo unlock → full audit trail.

**Complete flow:**
```
1. Officer approaches locker with RFID card
2. ESP32 reads card → POST /api/hardware/events
3. Backend validates: officer registered? RFID assigned? Evidence active?
4. Backend sends WebSocket event to frontend: "officer OF-2026-XXXX scan detected"
5. Frontend prompts: "Face verification required for OF-2026-XXXX"
6. Laptop camera captures face → POST /api/face/authenticate
7. Face matches → Backend sends HTTP response to pending ESP32 request
8. ESP32 receives 200 "processed" → servo unlocks
9. MongoDB records: Transaction + ChainOfCustody + (optional) FaceVerificationLog
10. Frontend dashboard updates in real-time
```

---

## 🔧 Backend API Endpoints Used by Hardware

| Method | Endpoint | Used By | Purpose |
|---|---|---|---|
| `POST` | `/api/hardware/events` | ESP32 | Report RFID scan events |
| `GET` | `/api/health` | ESP32 | Connectivity ping |
| `GET` | `/api/rfid` | ESP32 (Phase 3) | Fetch RFID whitelist |
| `POST` | `/api/rfid` | Admin / Backend | Register new RFID tag |
| `POST` | `/api/rfid/assign` | Admin / Backend | Assign RFID to evidence |
| `GET` | `/api/rfid/mappings` | Frontend | View RFID-evidence mappings |
| `GET` | `/api/officers` | Frontend | List officers |
| `POST` | `/api/officers` | Admin | Register officer |

---

## 📊 Data Recorded Per RFID Scan

### In MongoDB (when backend reachable)

**Collection: `transactions`**
```json
{
  "transaction_id": "txn-abc123def456",
  "evidence_id": "EVD-2026-XXXX",
  "officer_id": "OF-2026-ABCD1234",
  "action": "scan",
  "timestamp": "2026-11-11T16:22:00Z"
}
```

**Collection: `chain_of_custody`**
```json
{
  "custody_id": "custody-xyz789abc012",
  "evidence_id": "EVD-2026-XXXX",
  "transaction_id": "txn-abc123def456",
  "officer_id": "OF-2026-ABCD1234",
  "action": "scan",
  "remarks": "Hardware event processed for RFID evidence EVD-2026-XXXX",
  "timestamp": "2026-11-11T16:22:00Z"
}
```

**Collection: `security_alerts`** (on DENIED events)
```json
{
  "alert_id": "alert-def456ghi789",
  "officer_id": "unknown",
  "evidence_id": "unknown",
  "alert_type": "tamper_event",
  "description": "RFID tag FF:FF:FF:FF is not assigned to evidence",
  "severity": "high",
  "message": "...",
  "status": "open",
  "timestamp": "2026-11-11T16:35:12Z"
}
```

---

## 🌐 Network Requirements

| Requirement | Value |
|---|---|
| ESP32 and laptop must be on the same WiFi network | ✅ Required |
| Backend must bind to `0.0.0.0` (not just `127.0.0.1`) | ✅ Required |
| Backend startup command | `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` |
| ESP32 must know laptop's WiFi IP | Set in `include/config.h` → `BACKEND_HOST` |
| Find laptop IP | `ipconfig` (Windows) → WiFi adapter IPv4 |

---

## 🔐 Security Considerations

| Risk | Mitigation |
|---|---|
| Unauthorized RFID card access | Backend validates officer + RFID + mapping in DB |
| WiFi-less bypass attempt | Safe-fail: offline mode denies ALL access |
| Replay attack (re-send captured POST) | Add nonce/HMAC in Phase 5 (pending) |
| WiFi unavailable | Access is denied and the event is not stored locally |
| Backend unreachable | Deny access (not allow) — conservative safe-fail |
| Config.h with credentials committed | `.gitignore` prevents; use `config.h.example` template |

---

## 🗓️ Suggested Integration Timeline

| Week | Milestone |
|---|---|
| Week 1 | Phase 1: All components tested individually (pio test) |
| Week 2 | Phase 2: WiFi + Backend live connection with real RFID cards |
| Week 3 | Phase 3: Whitelist caching + offline-aware logic |
| Week 4 | Phase 4: Camera face verification flow (laptop side) |
| Week 5 | Phase 5: Full end-to-end system test + documentation |

---

## 🛠️ Development Setup Checklist

Before starting integration testing:

- [ ] `config.h` created from `config.h.example`
- [ ] WiFi SSID and password filled in
- [ ] `BACKEND_HOST` set to laptop's WiFi IP (from `ipconfig`)
- [ ] MongoDB running (`mongod`)
- [ ] Backend started: `uvicorn app.main:app --reload --host 0.0.0.0`
- [ ] At least one officer registered with officer_id = RFID card UID
- [ ] RFID tag registered and assigned to evidence in backend
- [ ] All hardware connections verified with CONNECTIONS.md
- [ ] Component tests passing: `pio test -e test_rfid`, `test_lcd`, etc.
- [ ] Firmware uploaded: `pio run -t upload`
- [ ] Serial monitor open: `pio device monitor --baud 115200`

