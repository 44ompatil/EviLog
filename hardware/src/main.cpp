/**
 * main.cpp
 * EviLog — ESP32 DevKit V1 — Main Prototype Firmware
 * ════════════════════════════════════════════════════════════════════
 *
 * EviLog is a hardware-assisted evidence tracking system for law enforcement.
 * The firmware reads RFID cards and uses their UIDs to trigger the access flow.
 *
 *   1. Reads an RFID card UID
 *   2. Sends events to the FastAPI backend for validation
 *   3. Grants or denies access by moving a servo motor
 *   4. Displays results on a 16×2 I2C LCD
 *   5. Sounds the buzzer on unauthorized access
 *   6. Reports scan events to the backend for audit
 *
 * Hardware: ESP32 DevKit V1 (ESP32-WROOM-32)
 * See hardware_pins.h for all GPIO assignments.
 * See config.h for WiFi credentials and backend host.
 *
 * ── System Flow ──────────────────────────────────────────────────
 *  Power ON → Init peripherals → Connect WiFi → Sync NTP → Ready
 *  Loop:
 *    Wait for RFID card
 *    → Send event to backend (or fallback offline)
 *    → ALLOWED: Green LED, Servo unlock, LCD "ACCESS GRANTED", short beep
 *    → DENIED:  Red LED,   Servo stays locked, LCD "UNAUTHORIZED", long buzz
 *    → Events are recorded by the backend when available
 *    → Delay SERVO_UNLOCK_HOLD_MS, then re-lock
 *    → Ready state
 *
 * ── Offline Mode ─────────────────────────────────────────────────
 *  If WiFi is unavailable, the system falls into OFFLINE mode:
 *    - All scans are DENIED by default (safe-fail)
 *    - Access is denied and events are not stored locally
 *    - LCD shows "OFFLINE Mode" on boot
 *    - System retries WiFi every WIFI_RETRY_INTERVAL_MS
 *
 * ── Serial Protocol ──────────────────────────────────────────────
 *  Baud: 115200
 *  Format: [TAG] message
 *  Tags: [BOOT] [RFID] [SERVO] [LCD] [WiFi] [HTTP] [EVENT]
 *
 * ════════════════════════════════════════════════════════════════════
 */

#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>

// Project headers
#include "hardware_pins.h"
#include "evilog_types.h"

// Config — credentials & backend host
// Copy include/config.h.example → include/config.h and fill in values
#if __has_include("config.h")
  #include "config.h"
#else
  #error "config.h not found! Copy include/config.h.example to include/config.h and fill in your WiFi and backend details."
#endif

// EviLog library modules
#include "RFIDManager.h"
#include "LCDManager.h"
#include "ServoController.h"
#include "BuzzerController.h"
#include "EviLogWiFi.h"
#include "BackendClient.h"

// ── Subsystem Objects ─────────────────────────────────────────────
RFIDManager     rfid(RFID_SS_PIN, RFID_RST_PIN);
LCDManager      lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);
ServoController servo(SERVO_PIN, SERVO_LOCKED, SERVO_UNLOCKED);
BuzzerController buzzer(BUZZER_PIN);
EviLogWiFi      wifi;
BackendClient   backend(BACKEND_HOST, BACKEND_PORT, BACKEND_PATH, HTTP_TIMEOUT_MS);

// ── State ─────────────────────────────────────────────────────────
static bool wifiReady   = false;
static bool ntpReady    = false;
static unsigned long lastWifiRetry = 0;
static const unsigned long WIFI_RETRY_INTERVAL_MS = 30000; // 30s

static bool rfidReady   = false;
static unsigned long lastRfidRetry = 0;
static unsigned long lastRfidDiagnostic = 0;
static const unsigned long RFID_RETRY_INTERVAL_MS = 5000; // 5s
static const unsigned long RFID_DIAGNOSTIC_INTERVAL_MS = 5000; // 5s
static const uint8_t RFID_STARTUP_ATTEMPTS = 3;

// ── Forward Declarations ──────────────────────────────────────────
void handleAccessGranted(const String& uid, const String& timestamp);
void handleAccessDenied(const String& uid, const String& timestamp, const char* reason);
void handleBackendError(const String& uid, const String& timestamp);
void handleOffline(const String& uid, const String& timestamp);
void processScan(const String& uid, const char* source);
void setLEDs(bool green, bool red);
void printBanner();
bool tryConnectWiFi();

// ══════════════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════════════
void setup() {
    Serial.begin(115200);
    delay(500);
    printBanner();

    // ── GPIO Init ─────────────────────────────────────────────────
    pinMode(LED_GREEN_PIN, OUTPUT);
    pinMode(LED_RED_PIN,   OUTPUT);
    setLEDs(false, false);

    // ── I2C + LCD ────────────────────────────────────────────────
    lcd.begin();
    lcd.showBoot();
    Serial.println("[BOOT] LCD initialized");

    // ── Buzzer ───────────────────────────────────────────────────
    buzzer.begin();
    buzzer.beepBoot();
    Serial.println("[BOOT] Buzzer initialized");

    // ── SPI + RFID ───────────────────────────────────────────────
    lcd.show("Init RFID...", "");
    for (uint8_t attempt = 1; attempt <= RFID_STARTUP_ATTEMPTS && !rfidReady; ++attempt) {
        if (attempt > 1) {
            Serial.print("[BOOT] Retrying RFID initialization (attempt ");
            Serial.print(attempt);
            Serial.println(")...");
            delay(250);
        }
        rfidReady = rfid.begin();
    }

    if (!rfidReady) {
        Serial.println("[BOOT] RFID init failed after startup retries — check SPI wiring and 3.3V power");
        lcd.showError("RFID Init FAIL");
    } else {
        Serial.println("[BOOT] RFID initialized OK");
    }
    // ── Servo ────────────────────────────────────────────────────
    lcd.show("Init Servo...", "");
    servo.begin(); // Moves to LOCKED position on init
    Serial.println("[BOOT] Servo initialized — LOCKED");


    // ── WiFi + NTP ───────────────────────────────────────────────
    wifiReady = tryConnectWiFi();

    if (wifiReady) {
        lcd.show(" WiFi Connected ", wifi.getLocalIP());
        delay(1500);

        // Sync NTP for accurate timestamps
        ntpReady = wifi.syncNTP();
        if (ntpReady) {
            Serial.print("[BOOT] NTP synced: ");
            Serial.println(wifi.getISO8601Timestamp());
        } else {
            Serial.println("[BOOT] NTP sync failed — timestamps may be inaccurate");
        }
    } else {
        lcd.showWiFiFailed();
        buzzer.beepWarning();
        Serial.println("[BOOT] WiFi OFFLINE — running in local-only mode");
        delay(1500);
    }

    // ── Boot Complete ─────────────────────────────────────────────
    Serial.println("[BOOT] System ready");
    if (rfidReady) {
        lcd.showReady();
    } else {
        lcd.showError("RFID Init FAIL");
    }
    setLEDs(false, false);
}

// ══════════════════════════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════════════════════════
void loop() {
    if (!wifi.isConnected() && (millis() - lastWifiRetry > WIFI_RETRY_INTERVAL_MS)) {
        lastWifiRetry = millis();
        Serial.println("[WiFi] Retrying WiFi connection...");
        wifiReady = tryConnectWiFi();
        if (wifiReady && !ntpReady) {
            ntpReady = wifi.syncNTP();
        }
        lcd.showReady();
    }

    if (!rfidReady) {
        if (millis() - lastRfidRetry >= RFID_RETRY_INTERVAL_MS) {
            lastRfidRetry = millis();
            Serial.println("[RFID] Retrying reader initialization...");
            rfidReady = rfid.begin();
            if (rfidReady) {
                Serial.println("[RFID] Reader initialized; waiting for card");
                lcd.showReady();
            } else {
                lcd.showError("RFID Init FAIL");
            }
        }
        return;
    }

    // ── Wait for RFID Card ────────────────────────────────────────
    if (!rfid.isCardPresent()) {
        if (millis() - lastRfidDiagnostic >= RFID_DIAGNOSTIC_INTERVAL_MS) {
            lastRfidDiagnostic = millis();
            Serial.println("[RFID] Waiting for a 13.56 MHz card...");
        }
        return; // Non-blocking: keep polling
    }

    // ── Card Detected ─────────────────────────────────────────────
    String uid = rfid.readUID();
    rfid.haltCard();

    processScan(uid, "RFID");
}

void processScan(const String& uid, const char* source) {
    String timestamp = ntpReady
        ? wifi.getISO8601Timestamp()
        : "1970-01-01T00:00:00Z";

    Serial.print("[EVENT] ");
    Serial.print(source);
    Serial.print(" scan: uid=");
    Serial.print(uid);
    Serial.print(" timestamp=");
    Serial.println(timestamp);

    lcd.showScanning(uid);

    AccessResult result;
    if (wifi.isConnected()) {
        lcd.showBackendChecking();
        result = backend.postEvent(uid, EventType::SCAN, timestamp);

        Serial.print("[EVENT] Backend response: ");
        Serial.print(backend.getLastStatusCode());
        Serial.print(" -> ");
        Serial.println(accessResultToString(result));
    } else {
        result = AccessResult::OFFLINE;
        Serial.println("[EVENT] No WiFi — OFFLINE mode, denying access");
    }

    switch (result) {
        case AccessResult::ALLOWED:
            handleAccessGranted(uid, timestamp);
            break;

        case AccessResult::DENIED:
            handleAccessDenied(uid, timestamp, "Backend denied access");
            break;

        case AccessResult::BACKEND_ERROR:
            handleBackendError(uid, timestamp);
            break;

        case AccessResult::OFFLINE:
            handleOffline(uid, timestamp);
            break;
    }

    Serial.println("[EVENT] Holding... then re-locking");
    delay(SERVO_UNLOCK_HOLD_MS);

    servo.lock();
    setLEDs(false, false);
    lcd.showReady();

    Serial.println("[EVENT] Ready for next scan");
    Serial.println("----------------------------------------");
}

// ══════════════════════════════════════════════════════════════════
// ACCESS HANDLERS
// ══════════════════════════════════════════════════════════════════

void handleAccessGranted(const String& uid, const String& timestamp) {
    Serial.println("[EVENT] ✅ ACCESS GRANTED");

    // Visual + audio feedback
    setLEDs(true, false); // Green ON
    lcd.showAllowed(uid);
    buzzer.beepSuccess();

    // Unlock servo (open locker)
    servo.unlock();

}

void handleAccessDenied(const String& uid, const String& timestamp, const char* reason) {
    Serial.print("[EVENT] ❌ ACCESS DENIED — ");
    Serial.println(reason);

    // Visual + audio feedback
    setLEDs(false, true); // Red ON
    lcd.showDenied(uid);
    buzzer.beepFail();

    // Servo stays LOCKED — no movement

}

void handleBackendError(const String& uid, const String& timestamp) {
    Serial.println("[EVENT] ⚠ BACKEND_ERROR — denying as safe fallback");

    // Treat as denied for safety
    setLEDs(false, true);
    lcd.show(" BACKEND ERROR  ", uid);
    buzzer.beepWarning();

}

void handleOffline(const String& uid, const String& timestamp) {
    Serial.println("[EVENT] 📵 OFFLINE — denying as safe fallback");

    setLEDs(false, true);
    lcd.show("  OFFLINE MODE  ", "  ACCESS DENIED ");
    buzzer.beepWarning();

}

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

void setLEDs(bool green, bool red) {
    digitalWrite(LED_GREEN_PIN, green ? HIGH : LOW);
    digitalWrite(LED_RED_PIN,   red   ? HIGH : LOW);
}

bool tryConnectWiFi() {
    lcd.showWiFiConnecting(WIFI_SSID);
    bool ok = wifi.connect(WIFI_SSID, WIFI_PASSWORD, WIFI_CONNECT_TIMEOUT_MS);
    if (!ok) {
        lcd.showWiFiFailed();
    }
    return ok;
}

void printBanner() {
    Serial.println();
    Serial.println("╔══════════════════════════════════════╗");
    Serial.println("║          EviLog Firmware v1.0        ║");
    Serial.println("║   ESP32 DevKit V1 — Evidence Locker  ║");
    Serial.println("║   github.com/evilog                  ║");
    Serial.println("╚══════════════════════════════════════╝");
    Serial.println();
    Serial.print("  Device Location: ");
    Serial.println(DEVICE_LOCATION);
    Serial.print("  Backend: http://");
    Serial.print(BACKEND_HOST);
    Serial.print(":");
    Serial.println(BACKEND_PORT);
    Serial.println();
}

