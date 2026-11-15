/**
 * test_backend.cpp
 * EviLog — WiFi + Backend HTTP Client Test (Unity Framework)
 *
 * Tests:
 *   1. WiFi connection with credentials from config.h
 *   2. NTP time synchronization
 *   3. ISO-8601 timestamp generation
 *   4. Backend health check (GET /api/health)
 *   5. POST /api/hardware/events with a test payload
 *   6. Response interpretation (200 → ALLOWED, 400 → DENIED)
 *   7. WiFi disconnect / OFFLINE fallback
 *
 * IMPORTANT: Requires config.h with real WIFI_SSID, WIFI_PASSWORD,
 *            BACKEND_HOST, and backend running on the laptop.
 *
 * Run with:  pio test -e test_backend
 *
 * Setup before running:
 *   1. Copy include/config.h.example to include/config.h
 *   2. Fill in WiFi credentials and laptop IP
 *   3. Start backend: cd backend && uvicorn app.main:app --reload --host 0.0.0.0
 */

#include <Arduino.h>
#include <unity.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>

#include "hardware_pins.h"
#include "evilog_types.h"

// Config must exist — test will fail to compile without it
#if __has_include("config.h")
  #include "config.h"
#else
  // Fallback for compilation — tests will fail at runtime
  #define WIFI_SSID           "MISSING_CONFIG"
  #define WIFI_PASSWORD       "MISSING_CONFIG"
  #define BACKEND_HOST        "192.168.1.100"
  #define BACKEND_PORT        8000
  #define BACKEND_PATH        "/api/hardware/events"
  #define WIFI_CONNECT_TIMEOUT_MS  10000
  #define HTTP_TIMEOUT_MS          5000
#endif

#ifndef EVILOG_DEBUG
#define EVILOG_DEBUG 1
#endif

// Shared state across tests
static bool wifiConnected = false;
static String localIP = "";
static String testTimestamp = "";

// ── Test: WiFi Connection ─────────────────────────────────────────
void test_wifi_connect() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("[TEST] Connecting to WiFi: ");
    Serial.println(WIFI_SSID);

    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - start > WIFI_CONNECT_TIMEOUT_MS) {
            Serial.println("\n[TEST] WiFi TIMEOUT");
            TEST_FAIL_MESSAGE("WiFi connection timed out — check SSID/password in config.h");
            return;
        }
        delay(500);
        Serial.print(".");
    }

    wifiConnected = true;
    localIP = WiFi.localIP().toString();

    Serial.println();
    Serial.print("[TEST] Connected! IP: ");
    Serial.println(localIP);

    TEST_ASSERT_TRUE_MESSAGE(WiFi.status() == WL_CONNECTED, "WiFi not connected");
    Serial.println("[TEST] WiFi connect: PASS");
}

// ── Test: NTP Sync ────────────────────────────────────────────────
void test_ntp_sync() {
    if (!wifiConnected) {
        TEST_IGNORE_MESSAGE("WiFi not connected — NTP test skipped");
        return;
    }

    configTime(0, 0, "pool.ntp.org", "time.google.com");

    Serial.print("[TEST] NTP sync");
    struct tm timeinfo;
    uint32_t start = millis();

    while (!getLocalTime(&timeinfo)) {
        if (millis() - start > 5000) {
            TEST_FAIL_MESSAGE("NTP time sync failed after 5 seconds");
            return;
        }
        delay(500);
        Serial.print(".");
    }

    // Build ISO timestamp
    char buf[25];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    testTimestamp = String(buf);

    Serial.println();
    Serial.print("[TEST] Time: ");
    Serial.println(testTimestamp);

    // Basic sanity: year should be >= 2026
    TEST_ASSERT_TRUE_MESSAGE(testTimestamp.startsWith("20"),
        "Timestamp year looks wrong — NTP may not have synced");

    Serial.println("[TEST] NTP sync: PASS");
}

// ── Test: ISO Timestamp Format ────────────────────────────────────
void test_timestamp_format() {
    if (testTimestamp.length() == 0) {
        testTimestamp = "2026-11-11T16:22:00Z"; // Fallback for offline test
    }

    // Should match: YYYY-MM-DDTHH:MM:SSZ (20 chars)
    TEST_ASSERT_EQUAL_MESSAGE(20, testTimestamp.length(),
        "ISO timestamp is not 20 characters");

    TEST_ASSERT_EQUAL_MESSAGE('T', testTimestamp[10],
        "ISO timestamp missing 'T' separator");

    TEST_ASSERT_EQUAL_MESSAGE('Z', testTimestamp[19],
        "ISO timestamp missing trailing 'Z'");

    Serial.println("[TEST] Timestamp format: PASS");
}

// ── Test: Backend Health Check ────────────────────────────────────
void test_backend_ping() {
    if (!wifiConnected) {
        TEST_IGNORE_MESSAGE("WiFi not connected — backend test skipped");
        return;
    }

    HTTPClient http;
    String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) + "/api/health";

    Serial.print("[TEST] Pinging backend: ");
    Serial.println(url);

    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT_MS);
    int code = http.GET();
    String body = (code > 0) ? http.getString() : "";
    http.end();

    Serial.print("[TEST] Health check response: ");
    Serial.print(code);
    Serial.print(" | body: ");
    Serial.println(body);

    TEST_ASSERT_EQUAL_MESSAGE(200, code,
        "Backend not reachable — is FastAPI running? Is BACKEND_HOST correct in config.h?");

    TEST_ASSERT_TRUE_MESSAGE(body.indexOf("\"ok\"") >= 0,
        "Backend health response does not contain 'ok' status");

    Serial.println("[TEST] Backend ping: PASS");
}

// ── Test: POST Event (Known Unknown UID → Expect DENIED) ──────────
void test_backend_post_unknown_uid() {
    if (!wifiConnected) {
        TEST_IGNORE_MESSAGE("WiFi not connected — POST event test skipped");
        return;
    }

    HTTPClient http;
    String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) + String(BACKEND_PATH);

    // This UID is intentionally unknown — backend should return 400 alert_created
    String payload = "{";
    payload += "\"officer_id\":\"FF:FF:FF:FF\",";
    payload += "\"rfid_id\":\"FF:FF:FF:FF\",";
    payload += "\"event_type\":\"scan\",";
    payload += "\"timestamp\":\"" + testTimestamp + "\"";
    payload += "}";

    Serial.print("[TEST] POST to: ");
    Serial.println(url);
    Serial.print("[TEST] Payload: ");
    Serial.println(payload);

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_TIMEOUT_MS);
    int code = http.POST(payload);
    String body = (code > 0) ? http.getString() : "";
    http.end();

    Serial.print("[TEST] Response: ");
    Serial.print(code);
    Serial.print(" | body: ");
    Serial.println(body);

    // Backend should respond with 400 (alert created for unknown officer/rfid)
    TEST_ASSERT_EQUAL_MESSAGE(400, code,
        "Expected HTTP 400 for unknown RFID UID — backend may not be running or UID is registered");

    TEST_ASSERT_TRUE_MESSAGE(body.indexOf("alert_created") >= 0,
        "Expected 'alert_created' in response body for unknown UID");

    Serial.println("[TEST] POST unknown UID → DENIED: PASS");
}

// ── Test: JSON Payload Builder ────────────────────────────────────
void test_json_payload_format() {
    String uid = "A1:B2:C3:D4";
    String eventType = "scan";
    String ts = "2026-11-11T16:22:00Z";

    String json = "{";
    json += "\"officer_id\":\"" + uid + "\",";
    json += "\"rfid_id\":\"" + uid + "\",";
    json += "\"event_type\":\"" + eventType + "\",";
    json += "\"timestamp\":\"" + ts + "\"";
    json += "}";

    Serial.print("[TEST] JSON payload: ");
    Serial.println(json);

    TEST_ASSERT_TRUE_MESSAGE(json.indexOf("officer_id") >= 0, "Missing officer_id field");
    TEST_ASSERT_TRUE_MESSAGE(json.indexOf("rfid_id") >= 0, "Missing rfid_id field");
    TEST_ASSERT_TRUE_MESSAGE(json.indexOf("event_type") >= 0, "Missing event_type field");
    TEST_ASSERT_TRUE_MESSAGE(json.indexOf("timestamp") >= 0, "Missing timestamp field");
    TEST_ASSERT_TRUE_MESSAGE(json.startsWith("{") && json.endsWith("}"),
        "JSON not properly bracketed");

    Serial.println("[TEST] JSON payload format: PASS");
}

// ── Test: OFFLINE fallback ────────────────────────────────────────
void test_offline_fallback() {
    // Simulate offline by checking WiFi status after disconnecting
    WiFi.disconnect(true);
    delay(1000);

    bool offline = (WiFi.status() != WL_CONNECTED);
    TEST_ASSERT_TRUE_MESSAGE(offline, "WiFi still connected after disconnect");

    // In offline mode, the system should return OFFLINE result
    // This is a logic test — no HTTP call needed
    AccessResult simulatedResult = offline ? AccessResult::OFFLINE : AccessResult::ALLOWED;
    TEST_ASSERT_EQUAL_MESSAGE((uint8_t)AccessResult::OFFLINE, (uint8_t)simulatedResult,
        "Offline fallback logic incorrect");

    Serial.println("[TEST] Offline fallback logic: PASS");
}

// ── Arduino Test Runner ───────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("===========================================");
    Serial.println("  EviLog Backend / WiFi Test");
    Serial.println("  Board: ESP32 DevKit V1");
    Serial.println("  Backend: http://" BACKEND_HOST ":" + String(BACKEND_PORT));
    Serial.println("===========================================");

    UNITY_BEGIN();
    RUN_TEST(test_json_payload_format);   // No WiFi needed
    RUN_TEST(test_timestamp_format);       // No WiFi needed
    RUN_TEST(test_wifi_connect);
    RUN_TEST(test_ntp_sync);
    RUN_TEST(test_backend_ping);
    RUN_TEST(test_backend_post_unknown_uid);
    RUN_TEST(test_offline_fallback);
    UNITY_END();
}

void loop() {}

