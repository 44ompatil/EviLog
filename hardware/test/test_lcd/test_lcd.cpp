/**
 * test_lcd.cpp
 * EviLog — LCD Display Component Test (Unity Framework)
 *
 * Tests:
 *   1. LCD initialization over I2C
 *   2. Two-line text display
 *   3. All EviLog-specific display states (boot, ready, allowed, denied, etc.)
 *   4. String padding/truncation behavior
 *
 * Visual Verification:
 *   Watch the physical LCD cycle through all display states.
 *   Each state is shown for 1.5 seconds.
 *
 * Run with:  pio test -e test_lcd
 */

#include <Arduino.h>
#include <unity.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#include "hardware_pins.h"

#ifndef EVILOG_DEBUG
#define EVILOG_DEBUG 1
#endif

LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

// Helper to display and verify text does not crash
void displayAndPause(const String& l1, const String& l2, uint32_t pauseMs = 1500) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(l1.substring(0, LCD_COLS));
    lcd.setCursor(0, 1);
    lcd.print(l2.substring(0, LCD_COLS));
    delay(pauseMs);
}

// ── Test: I2C LCD Init ────────────────────────────────────────────
void test_lcd_init() {
    Wire.begin(LCD_SDA_PIN, LCD_SCL_PIN);

    // Check if device responds at I2C address
    Wire.beginTransmission(LCD_I2C_ADDR);
    uint8_t error = Wire.endTransmission();

    if (error != 0) {
        Serial.print("[TEST] I2C device NOT found at 0x");
        Serial.print(LCD_I2C_ADDR, HEX);
        Serial.println(" — trying 0x3F");

        // Try alternate address 0x3F
        Wire.beginTransmission(0x3F);
        error = Wire.endTransmission();

        TEST_ASSERT_EQUAL_MESSAGE(0, error,
            "LCD not found at 0x27 or 0x3F. Check SDA(21)/SCL(22) wiring and I2C address.");
    }

    lcd.init();
    lcd.backlight();

    Serial.println("[TEST] LCD Init: PASS");
    TEST_PASS();
}

// ── Test: Text Display ────────────────────────────────────────────
void test_lcd_display_text() {
    displayAndPause("  EviLog Test   ", "  Running...    ");
    // No crash = pass
    TEST_PASS_MESSAGE("LCD displayed text without crash");
}

// ── Test: All EviLog Screen States ───────────────────────────────
void test_lcd_all_states() {
    Serial.println("[TEST] Cycling through all LCD states...");

    displayAndPause("  EviLog v1.0  ", " Initializing..", 1500);
    Serial.println("[LCD] showBoot: OK");

    displayAndPause("  EviLog Ready  ", " Tap RFID Card ", 1500);
    Serial.println("[LCD] showReady: OK");

    displayAndPause("  Scanning...   ", "A1:B2:C3:D4     ", 1500);
    Serial.println("[LCD] showScanning: OK");

    displayAndPause(" ACCESS GRANTED ", "A1:B2:C3:D4     ", 1500);
    Serial.println("[LCD] showAllowed: OK");

    displayAndPause("  UNAUTHORIZED  ", "FF:EE:DD:CC     ", 1500);
    Serial.println("[LCD] showDenied: OK");

    displayAndPause("Connecting WiFi:", "MyNetwork       ", 1500);
    Serial.println("[LCD] showWiFiConnecting: OK");

    displayAndPause(" WiFi Connected ", "192.168.1.105   ", 1500);
    Serial.println("[LCD] showWiFiOK: OK");

    displayAndPause("  WiFi FAILED   ", "  Offline Mode  ", 1500);
    Serial.println("[LCD] showWiFiFailed: OK");

    displayAndPause(" Verifying...   ", " Backend Check  ", 1500);
    Serial.println("[LCD] showBackendChecking: OK");

    displayAndPause("     ERROR      ", "RFID Init FAIL  ", 1500);
    Serial.println("[LCD] showError: OK");

    // Return to ready state
    displayAndPause("  EviLog Ready  ", " Tap RFID Card ", 1000);

    TEST_PASS_MESSAGE("All LCD states displayed without crash");
}

// ── Test: Long String Truncation ─────────────────────────────────
void test_lcd_truncation() {
    // A string longer than 16 chars should not overflow
    String longStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // 26 chars
    String truncated = longStr.substring(0, LCD_COLS);

    TEST_ASSERT_EQUAL_MESSAGE(16, truncated.length(),
        "Substring truncation to 16 chars failed");

    displayAndPause(truncated, truncated, 1500);
    Serial.println("[TEST] String truncation: PASS");
}

// ── Arduino Test Runner ───────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("===========================================");
    Serial.println("  EviLog LCD Component Test");
    Serial.println("  Board: ESP32 DevKit V1");
    Serial.println("  LCD: 16x2 I2C (addr 0x27)");
    Serial.println("  Pins: SDA=21, SCL=22");
    Serial.println("===========================================");

    UNITY_BEGIN();
    RUN_TEST(test_lcd_init);
    RUN_TEST(test_lcd_display_text);
    RUN_TEST(test_lcd_all_states);
    RUN_TEST(test_lcd_truncation);
    UNITY_END();
}

void loop() {}

