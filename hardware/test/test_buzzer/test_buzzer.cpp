/**
 * test_buzzer.cpp
 * EviLog — Active Buzzer Component Test (Unity Framework)
 *
 * Tests:
 *   1. Buzzer GPIO initialization
 *   2. Boot chime (double beep)
 *   3. Success beep (short single)
 *   4. Failure buzz (long single)
 *   5. Warning beep (double medium)
 *   6. Silence (GPIO LOW)
 *
 * Audio Verification:
 *   Listen for distinct beep patterns as described below.
 *   Each pattern plays, then pauses 1 second before the next.
 *
 * Run with:  pio test -e test_buzzer
 */

#include <Arduino.h>
#include <unity.h>

#include "hardware_pins.h"

#ifndef EVILOG_DEBUG
#define EVILOG_DEBUG 1
#endif

// ── Helper ────────────────────────────────────────────────────────
void buzz(uint32_t durationMs) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(durationMs);
    digitalWrite(BUZZER_PIN, LOW);
}

// ── Test: GPIO Init ───────────────────────────────────────────────
void test_buzzer_init() {
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    // Verify pin mode was set (GPIO33 supports OUTPUT on ESP32)
    int mode = digitalRead(BUZZER_PIN);
    TEST_ASSERT_EQUAL_MESSAGE(0, mode, "Buzzer pin not LOW after init");

    Serial.print("[TEST] Buzzer initialized on GPIO");
    Serial.println(BUZZER_PIN);
    Serial.println("[TEST] Buzzer init: PASS");
}

// ── Test: Boot Chime ─────────────────────────────────────────────
void test_buzzer_boot_chime() {
    Serial.println("[TEST] Boot chime: 2× short beep");
    // 100ms ON, 100ms OFF, 100ms ON
    buzz(100);
    delay(100);
    buzz(100);
    delay(1000);

    TEST_PASS_MESSAGE("Boot chime completed (did you hear 2 short beeps?)");
}

// ── Test: Success Beep ────────────────────────────────────────────
void test_buzzer_success() {
    Serial.println("[TEST] Success beep: 1× 200ms beep");
    buzz(200);
    delay(1000);

    TEST_PASS_MESSAGE("Success beep completed (did you hear 1 short beep?)");
}

// ── Test: Failure Buzz ────────────────────────────────────────────
void test_buzzer_fail() {
    Serial.println("[TEST] Failure buzz: 1× 800ms long buzz");
    buzz(800);
    delay(1000);

    TEST_PASS_MESSAGE("Failure buzz completed (did you hear 1 long buzz?)");
}

// ── Test: Warning Beep ────────────────────────────────────────────
void test_buzzer_warning() {
    Serial.println("[TEST] Warning beep: 2× medium beep");
    buzz(150);
    delay(100);
    buzz(150);
    delay(1000);

    TEST_PASS_MESSAGE("Warning beep completed (did you hear 2 medium beeps?)");
}

// ── Test: Silence ─────────────────────────────────────────────────
void test_buzzer_silence() {
    Serial.println("[TEST] Buzzer silence test: 300ms on, then off");
    buzz(300);
    // After buzz() returns, pin is already LOW (silence)

    int pinState = digitalRead(BUZZER_PIN);
    TEST_ASSERT_EQUAL_MESSAGE(0, pinState,
        "Buzzer pin not LOW after silence (stuck HIGH?)");

    delay(500);
    Serial.println("[TEST] Silence: PASS");
}

// ── Test: LED Indicators (bonus, same test file) ──────────────────
void test_leds() {
    Serial.println("[TEST] LED indicators: Green then Red");

    pinMode(LED_GREEN_PIN, OUTPUT);
    pinMode(LED_RED_PIN, OUTPUT);

    // Green ON
    digitalWrite(LED_GREEN_PIN, HIGH);
    digitalWrite(LED_RED_PIN, LOW);
    Serial.println("[TEST] GREEN LED should be ON");
    delay(1000);

    // Red ON
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_RED_PIN, HIGH);
    Serial.println("[TEST] RED LED should be ON");
    delay(1000);

    // Both OFF
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_RED_PIN, LOW);
    Serial.println("[TEST] Both LEDs OFF");
    delay(500);

    TEST_PASS_MESSAGE("LED test: visually verify green then red turned on");
}

// ── Arduino Test Runner ───────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("===========================================");
    Serial.println("  EviLog Buzzer & LED Component Test");
    Serial.println("  Board: ESP32 DevKit V1");
    Serial.println("  Buzzer: GPIO33 (Active Buzzer)");
    Serial.println("  Green LED: GPIO26  Red LED: GPIO25");
    Serial.println("===========================================");

    UNITY_BEGIN();
    RUN_TEST(test_buzzer_init);
    RUN_TEST(test_buzzer_boot_chime);
    RUN_TEST(test_buzzer_success);
    RUN_TEST(test_buzzer_fail);
    RUN_TEST(test_buzzer_warning);
    RUN_TEST(test_buzzer_silence);
    RUN_TEST(test_leds);
    UNITY_END();
}

void loop() {}

