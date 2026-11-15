/**
 * test_rfid.cpp
 * EviLog — RFID Component Test (Unity Framework)
 *
 * Tests:
 *   1. MFRC522 initialization (firmware version check)
 *   2. SPI bus communication
 *   3. Card scan and UID formatting (interactive — requires physical card tap)
 *
 * Upload this test to the ESP32 and open Serial Monitor at 115200 baud.
 * Tap an RFID card when prompted.
 *
 * Run with:  pio test -e test_rfid
 */

#include <Arduino.h>
#include <unity.h>
#include <SPI.h>
#include <MFRC522.h>

// Include project headers
#include "hardware_pins.h"

// Use EVILOG_DEBUG without config.h for standalone test
#ifndef EVILOG_DEBUG
#define EVILOG_DEBUG 1
#endif

MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
bool rfidInitialized = false;

// ── Test: SPI + MFRC522 Initialization ───────────────────────────
void test_rfid_init() {
    SPI.begin(SPI_SCK_PIN, SPI_MISO_PIN, SPI_MOSI_PIN, RFID_SS_PIN);
    rfid.PCD_Init();
    delay(50);

    byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
    rfidInitialized = version != 0x00 && version != 0xFF;

    Serial.print("[TEST] MFRC522 firmware version: 0x");
    Serial.println(version, HEX);

    TEST_ASSERT_NOT_EQUAL_MESSAGE(0x00, version,
        "MFRC522 version is 0x00 — check SPI wiring and 3.3V power");
    TEST_ASSERT_NOT_EQUAL_MESSAGE(0xFF, version,
        "MFRC522 version is 0xFF — check SPI wiring and 3.3V power");

    // Other version values are unusual; the interactive scan test still determines whether
    // the reader can communicate with a card.
    Serial.println("[TEST] MFRC522 Init: PASS");
}

// ── Test: UID Formatting ──────────────────────────────────────────
void test_rfid_uid_format() {
    // Simulate a 4-byte UID: 0x01, 0x02, 0x03, 0x04
    rfid.uid.size = 4;
    rfid.uid.uidByte[0] = 0x01;
    rfid.uid.uidByte[1] = 0x02;
    rfid.uid.uidByte[2] = 0x0F; // Tests zero-padding
    rfid.uid.uidByte[3] = 0xAB;

    // Build UID string (same logic as RFIDManager::readUID)
    String uid = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
        if (i > 0) uid += ":";
        if (rfid.uid.uidByte[i] < 0x10) uid += "0";
        uid += String(rfid.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();

    Serial.print("[TEST] Formatted UID: ");
    Serial.println(uid);

    TEST_ASSERT_EQUAL_STRING("01:02:0F:AB", uid.c_str());
    Serial.println("[TEST] UID format: PASS");
}

// ── Test: Card Present (Interactive) ─────────────────────────────
void test_rfid_card_scan() {
    if (!rfidInitialized) {
        TEST_IGNORE_MESSAGE("Card scan skipped because RFID initialization failed");
        return;
    }

    Serial.println("[TEST] === TAP AN ISO/IEC 14443-A CARD WITHIN 10 SECONDS ===");

    uint32_t deadline = millis() + 10000;
    bool cardFound = false;

    while (millis() < deadline) {
        if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
            cardFound = true;

            String uid = "";
            for (byte i = 0; i < rfid.uid.size; i++) {
                if (i > 0) uid += ":";
                if (rfid.uid.uidByte[i] < 0x10) uid += "0";
                uid += String(rfid.uid.uidByte[i], HEX);
            }
            uid.toUpperCase();

            Serial.print("[TEST] Card detected! UID: ");
            Serial.println(uid);
            Serial.print("[TEST] UID bytes: ");
            Serial.println(rfid.uid.size);

            rfid.PICC_HaltA();
            rfid.PCD_StopCrypto1();
            break;
        }
        delay(100);
    }

    TEST_ASSERT_TRUE_MESSAGE(cardFound,
        "No compatible ISO/IEC 14443-A card detected within 10 seconds");
}

// ── Arduino Test Runner ───────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("===========================================");
    Serial.println("  EviLog RFID Component Test");
    Serial.println("  Board: ESP32 DevKit V1");
    Serial.println("  RFID: MFRC522 (SPI)");
    Serial.println("===========================================");

    UNITY_BEGIN();
    RUN_TEST(test_rfid_init);
    RUN_TEST(test_rfid_uid_format);
    RUN_TEST(test_rfid_card_scan);
    UNITY_END();
}

void loop() {
    // Tests run once in setup()
}

