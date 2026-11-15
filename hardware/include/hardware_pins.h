#pragma once
/**
 * hardware_pins.h
 * EviLog — ESP32 DevKit V1 Pin Definitions
 *
 * All hardware pin assignments for the EviLog prototype.
 * Edit only this file to remap pins; never scatter pin numbers in source files.
 *
 * Board: ESP32 DevKit V1 (ESP32-WROOM-32)
 * ─────────────────────────────────────────────────────────────────
 * SPI Bus is used by the MFRC522 RFID reader.
 * ─────────────────────────────────────────────────────────────────
 */

#include <Arduino.h>

// ── SPI Bus (RFID) ───────────────────────────────────────────────
constexpr uint8_t SPI_SCK_PIN  = 18;   // SPI clock
constexpr uint8_t SPI_MISO_PIN = 19;   // SPI Master-In-Slave-Out
constexpr uint8_t SPI_MOSI_PIN = 23;   // SPI Master-Out-Slave-In

// ── MFRC522 RFID Reader ──────────────────────────────────────────
constexpr uint8_t RFID_SS_PIN  = 5;    // SPI Chip-Select for RFID
constexpr uint8_t RFID_RST_PIN = 27;   // RFID Reset

// ── LCD 16×2 (I2C) ───────────────────────────────────────────────
constexpr uint8_t LCD_SDA_PIN  = 21;   // I2C Data
constexpr uint8_t LCD_SCL_PIN  = 22;   // I2C Clock
constexpr uint8_t LCD_I2C_ADDR = 0x27; // I2C address (try 0x3F if 0x27 fails)
constexpr uint8_t LCD_COLS     = 16;
constexpr uint8_t LCD_ROWS     = 2;

// ── SG90 Servo Motor ─────────────────────────────────────────────
constexpr uint8_t SERVO_PIN      = 13;  // PWM signal to servo
constexpr int     SERVO_LOCKED   = 0;   // Degrees: locked (fully closed)
constexpr int     SERVO_UNLOCKED = 90;  // Degrees: unlocked (locker open)

// ── Status LEDs ──────────────────────────────────────────────────
constexpr uint8_t LED_GREEN_PIN = 26;  // Green LED (Access Granted)
constexpr uint8_t LED_RED_PIN   = 25;  // Red LED   (Access Denied)
// Note: Connect LEDs through 220Ω resistors to GND.

// ── Active Buzzer ─────────────────────────────────────────────────
constexpr uint8_t BUZZER_PIN    = 33;  // Active buzzer (HIGH = ON)
// Note: Active buzzer — no tone() needed; just digitalWrite HIGH/LOW.
// If using PASSIVE buzzer, use tone() instead.

