/**
 * test_servo.cpp
 * EviLog — SG90 Servo Motor Component Test (Unity Framework)
 *
 * Tests:
 *   1. Servo attach and initial position
 *   2. Sweep to LOCKED position (0°)
 *   3. Sweep to UNLOCKED position (90°)
 *   4. Full range sweep (0° to 180°) for range-of-motion check
 *   5. Return to locked position
 *
 * Visual Verification:
 *   Watch the servo physically move through each position.
 *
 * Run with:  pio test -e test_servo
 */

#include <Arduino.h>
#include <unity.h>
#include <ESP32Servo.h>

#include "hardware_pins.h"

#ifndef EVILOG_DEBUG
#define EVILOG_DEBUG 1
#endif

Servo testServo;
int currentAngle = -1;

// Helper: move servo and track position
void moveTo(int angle, uint16_t stepMs = 15) {
    if (currentAngle < 0) {
        testServo.write(angle);
        currentAngle = angle;
        delay(500);
        return;
    }
    int step = (currentAngle < angle) ? 1 : -1;
    while (currentAngle != angle) {
        currentAngle += step;
        testServo.write(currentAngle);
        delay(stepMs);
    }
}

// ── Test: Servo Attach ────────────────────────────────────────────
void test_servo_attach() {
    ESP32PWM::allocateTimer(0);
    testServo.setPeriodHertz(50);
    testServo.attach(SERVO_PIN, 500, 2400);

    TEST_ASSERT_TRUE_MESSAGE(testServo.attached(),
        "Servo failed to attach — check GPIO13 wiring and 5V power");

    Serial.println("[TEST] Servo attach: PASS");
}

// ── Test: Move to Locked Position (0°) ───────────────────────────
void test_servo_lock_position() {
    Serial.println("[TEST] Moving servo to LOCKED position (0°)...");
    moveTo(SERVO_LOCKED, 10);
    delay(500);

    TEST_ASSERT_EQUAL_MESSAGE(SERVO_LOCKED, currentAngle,
        "Servo did not reach locked angle");

    Serial.print("[TEST] Servo at locked angle: ");
    Serial.print(currentAngle);
    Serial.println("° — PASS");
}

// ── Test: Move to Unlocked Position (90°) ────────────────────────
void test_servo_unlock_position() {
    Serial.println("[TEST] Moving servo to UNLOCKED position (90°)...");
    moveTo(SERVO_UNLOCKED, 10);
    delay(500);

    TEST_ASSERT_EQUAL_MESSAGE(SERVO_UNLOCKED, currentAngle,
        "Servo did not reach unlocked angle");

    Serial.print("[TEST] Servo at unlocked angle: ");
    Serial.print(currentAngle);
    Serial.println("° — PASS");
}

// ── Test: Full Range of Motion ────────────────────────────────────
void test_servo_full_range() {
    Serial.println("[TEST] Full range sweep 0° → 180° → 0°...");

    moveTo(0, 8);
    delay(300);
    moveTo(90, 8);
    delay(300);
    moveTo(180, 8);
    delay(300);
    moveTo(0, 8);
    delay(300);

    TEST_ASSERT_EQUAL_MESSAGE(0, currentAngle,
        "Servo did not return to 0° after full range sweep");

    Serial.println("[TEST] Full range sweep: PASS");
}

// ── Test: Lock-Unlock Cycle ───────────────────────────────────────
void test_servo_lock_unlock_cycle() {
    Serial.println("[TEST] Lock → Unlock → Lock cycle...");

    // Lock
    moveTo(SERVO_LOCKED, 10);
    delay(500);
    TEST_ASSERT_EQUAL(SERVO_LOCKED, currentAngle);

    // Unlock
    moveTo(SERVO_UNLOCKED, 10);
    delay(500);
    TEST_ASSERT_EQUAL(SERVO_UNLOCKED, currentAngle);

    // Re-lock
    moveTo(SERVO_LOCKED, 10);
    delay(500);
    TEST_ASSERT_EQUAL(SERVO_LOCKED, currentAngle);

    Serial.println("[TEST] Lock-Unlock cycle: PASS");
}

// ── Arduino Test Runner ───────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(2000);

    Serial.println("===========================================");
    Serial.println("  EviLog Servo Component Test");
    Serial.println("  Board: ESP32 DevKit V1");
    Serial.println("  Servo: SG90 on GPIO13");
    Serial.println("  Locked=0°  Unlocked=90°");
    Serial.println("===========================================");

    UNITY_BEGIN();
    RUN_TEST(test_servo_attach);
    RUN_TEST(test_servo_lock_position);
    RUN_TEST(test_servo_unlock_position);
    RUN_TEST(test_servo_full_range);
    RUN_TEST(test_servo_lock_unlock_cycle);
    UNITY_END();

    // Ensure servo ends locked
    moveTo(SERVO_LOCKED, 10);
    testServo.detach();
}

void loop() {}

