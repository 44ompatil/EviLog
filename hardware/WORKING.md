# EviLog Hardware — System Working Explanation

**Firmware:** `src/main.cpp` + `lib/EviLogHW/`  
**Board:** ESP32 DevKit V1  
**Framework:** PlatformIO / Arduino

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   ESP32 DevKit V1 Firmware                   │
│                                                               │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │RFID      │   │LCD       │   │Servo     │   │Buzzer    │ │
│  │Manager   │   │Manager   │   │Controller│   │          │ │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘ │
│       │              │               │               │        │
│  ┌────┴─────────────┴───────────────┴───────────────┴─────┐ │
│  │                     main.cpp Loop                        │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                            │                                   │
│  ┌─────────────────────────┴──────────────────────────────┐  │
│  │          BackendClient (HTTP POST via WiFi)             │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │
              │ WiFi HTTP POST /api/hardware/events
              ▼
┌─────────────────────────────────────────────────────────────┐
│          FastAPI Backend (Laptop)                             │
│          MongoDB ← Transactions, Chain-of-Custody, Alerts     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Boot Sequence

1. **Serial init** (115200 baud) → prints firmware banner
2. **I2C + LCD init** → shows "EviLog v1.0 / Initializing..."
3. **Buzzer** → double boot beep confirms audio works
4. **SPI + RFID** → MFRC522 firmware version checked; fail if 0x00 or 0xFF
5. **Servo** → attaches, sweeps to 0° (LOCKED position)
6. **WiFi** → connects to `WIFI_SSID`; timeout after `WIFI_CONNECT_TIMEOUT_MS`
7. **NTP sync** → gets UTC time from `pool.ntp.org` for accurate timestamps
8. **Ready** → LCD shows "EviLog Ready / Tap RFID Card"

---

## 🔁 Main Loop — RFID Scan Flow

### Step-by-Step

```
1. Poll: rfid.isCardPresent()
         ↓ (card found)
2. Read: uid = rfid.readUID()
         e.g. "A1:B2:C3:D4"

3. Get:  timestamp = wifi.getISO8601Timestamp()
         e.g. "2026-11-11T16:22:00Z"

4. LCD:  showScanning(uid)

5. If WiFi connected:
         LCD: showBackendChecking()
         result = backend.postEvent(uid, "scan", timestamp)
         HTTP POST /api/hardware/events →
         {
           "officer_id": "A1:B2:C3:D4",
           "rfid_id":    "A1:B2:C3:D4",
           "event_type": "scan",
           "timestamp":  "2026-11-11T16:22:00Z"
         }

   If WiFi offline:
         result = OFFLINE (denies access as safe-fail)

6. Act on result:
   ┌─────────────┬────────────────────────────────────────────┐
   │ ALLOWED     │ Green LED ON, Servo → 90°, LCD "ACCESS     │
   │             │ GRANTED", short beep (200ms)               │
   ├─────────────┼────────────────────────────────────────────┤
   │ DENIED      │ Red LED ON, Servo STAYS LOCKED (0°),       │
   │             │ LCD "UNAUTHORIZED", long buzz (800ms)      │
   ├─────────────┼────────────────────────────────────────────┤
   │ BACKEND_ERR │ Red LED ON, LCD "BACKEND ERROR", double    │
   │             │ warning beep, deny access (safe-fail)      │
   ├─────────────┼────────────────────────────────────────────┤
   │ OFFLINE     │ Red LED ON, LCD "OFFLINE MODE", double     │
   │             │ warning beep, deny access (safe-fail)      │
   └─────────────┴────────────────────────────────────────────┘

7. Wait: SERVO_UNLOCK_HOLD_MS (default 3000ms)

8. Reset: Servo → 0° (LOCK), LEDs OFF, LCD "EviLog Ready"
```

---

## 🔐 Servo Motor Logic

| State | Servo Angle | Meaning |
|---|---|---|
| LOCKED | 0° | Evidence locker is physically closed. No access. |
| UNLOCKED | 90° | Locker door can be opened. Officer has access. |

The servo **holds the unlocked position** for `SERVO_UNLOCK_HOLD_MS` (3 seconds default), then automatically returns to locked. This is a **time-limited access window** — the officer must retrieve evidence within 3 seconds, or the locker re-locks.

The `SERVO_UNLOCK_HOLD_MS` value is configurable in `include/config.h`.

### Smooth Movement
The `ServoController::sweepTo()` method moves the servo 1° at a time with a configurable step delay, preventing mechanical shock and jitter from sudden position jumps.

---

## 📡 Backend Communication

### HTTP Request
```
POST http://<BACKEND_HOST>:8000/api/hardware/events
Content-Type: application/json

{
  "officer_id": "<rfid_uid>",
  "rfid_id":    "<rfid_uid>",
  "event_type": "scan",
  "timestamp":  "2026-11-11T16:22:00Z"
}
```

### Backend Logic (from `event_processing_service.py`)

The backend performs these checks in order:
1. **Event type** must be in `SUPPORTED_EVENTS` (`scan`, `check_in`, `check_out`, etc.)
2. **Officer exists**: `officers.find_one({"officer_id": rfid_uid})`
3. **RFID tag exists** and is in `"assigned"` status
4. **RFID has an active mapping** to evidence

If all checks pass → **200 OK** (`status: "processed"`) → `ALLOWED`  
If any check fails → **400 Bad Request** (`status: "alert_created"`) → `DENIED`

### Response Interpretation

| HTTP Code | Backend status | Hardware Result |
|---|---|---|
| 200 | `"processed"` | `ALLOWED` — servo unlocks |
| 400 | `"alert_created"` | `DENIED` — buzzer alarms |
| 404 | Not found | `DENIED` |
| 409 | Conflict | `DENIED` |
| 5xx / timeout | Error | `BACKEND_ERROR` → deny |
| No WiFi | — | `OFFLINE` → deny |

---

---

## 📺 LCD Display States

| LCD Display | Meaning | Duration |
|---|---|---|
| `EviLog v1.0` / `Initializing..` | Boot | Until boot complete |
| `EviLog Ready` / `Tap RFID Card` | Idle waiting | Indefinite |
| `Scanning...` / `<uid>` | Card read in progress | ~500ms |
| `Verifying...` / `Backend Check` | HTTP request in flight | Until response |
| `ACCESS GRANTED` / `<uid>` | Access allowed | `SERVO_UNLOCK_HOLD_MS` |
| `UNAUTHORIZED` / `<uid>` | Access denied | `SERVO_UNLOCK_HOLD_MS` |
| `BACKEND ERROR` / `<uid>` | HTTP failed | `SERVO_UNLOCK_HOLD_MS` |
| `OFFLINE MODE` / `ACCESS DENIED` | No WiFi | `SERVO_UNLOCK_HOLD_MS` |
| `Connecting WiFi:` / `<ssid>` | WiFi connect | Until connected/timeout |
| `WiFi Connected` / `<ip>` | WiFi OK | 1.5s |
| `WiFi FAILED` / `Offline Mode` | WiFi failed | 1.5s |

---

## 🔊 Buzzer Sound Patterns

| Event | Pattern | Duration |
|---|---|---|
| Boot chime | Beep — pause — Beep | 100ms + 100ms + 100ms |
| Access GRANTED | Single short beep | 200ms |
| Access DENIED | Long continuous buzz | 800ms |
| Warning (offline/error) | Beep — pause — Beep (medium) | 150ms + 100ms + 150ms |

---

## 🔄 WiFi Reconnect

If WiFi drops during operation:
- The firmware detects `WiFi.status() != WL_CONNECTED` on each HTTP call
- Returns `OFFLINE` result → deny + local log
- Every `WIFI_RETRY_INTERVAL_MS` (30 seconds), automatically retries WiFi connection
- NTP re-syncs if WiFi reconnects

---

## 🐛 Serial Debug Output

With `EVILOG_DEBUG=1` (default), the ESP32 prints structured debug logs at 115200 baud:

```
╔══════════════════════════════════════╗
║          EviLog Firmware v1.0        ║
║   ESP32 DevKit V1 — Evidence Locker  ║
╚══════════════════════════════════════╝
[BOOT] LCD initialized
[BOOT] Buzzer initialized
[RFID] Firmware version: 0x92
[RFID] Init OK
[SERVO] Initialized on GPIO 13 | Locked=0° Unlocked=90°
[SERVO] LOCKED
[WiFi] Connecting to: MyNetwork..........
[WiFi] Connected! IP: 192.168.1.105
[WiFi] Syncing NTP time.....
[WiFi] NTP synced: 2026-11-11T16:22:00Z
[BOOT] System ready
[EVENT] RFID scan: uid=A1:B2:C3:D4 timestamp=2026-11-11T16:22:05Z
[HTTP] POST http://192.168.1.100:8000/api/hardware/events
[HTTP] Response code: 200
[EVENT] Backend response: 200 → ALLOWED
[SERVO] UNLOCKED
[EVENT] Holding... then re-locking
[SERVO] LOCKED
[EVENT] Ready for next scan
```

