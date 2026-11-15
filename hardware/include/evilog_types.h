#pragma once
/**
 * evilog_types.h
 * EviLog — Shared Enums, Structs, and Constants
 *
 * Central type definitions used across the entire firmware.
 * Include this header anywhere these types are needed.
 */

#include <Arduino.h>

// ── Access Decision ───────────────────────────────────────────────
/**
 * AccessResult encodes the outcome of an RFID scan.
 *
 * ALLOWED       — Backend confirmed card is registered and event processed.
 * DENIED        — Backend returned alert (tamper / unknown tag).
 * BACKEND_ERROR — HTTP request failed with unexpected status code.
 * OFFLINE       — No WiFi available; access is denied without local logging.
 */
enum class AccessResult : uint8_t {
    ALLOWED       = 0,
    DENIED        = 1,
    BACKEND_ERROR = 2,
    OFFLINE       = 3
};

// ── Supported Event Types ─────────────────────────────────────────
// Match exactly the SUPPORTED_EVENTS set in backend/app/services/event_processing_service.py
namespace EventType {
    constexpr const char* SCAN      = "scan";
    constexpr const char* CHECK_IN  = "check_in";
    constexpr const char* CHECK_OUT = "check_out";
    constexpr const char* ACCESS    = "access";
    constexpr const char* TRANSFER  = "transfer";
    constexpr const char* INVENTORY = "inventory";
    constexpr const char* SEAL      = "seal";
    constexpr const char* TAMPER    = "tamper";
}

// ── String Helpers ────────────────────────────────────────────────
inline const char* accessResultToString(AccessResult r) {
    switch (r) {
        case AccessResult::ALLOWED:       return "ALLOWED";
        case AccessResult::DENIED:        return "DENIED";
        case AccessResult::BACKEND_ERROR: return "BACKEND_ERROR";
        case AccessResult::OFFLINE:       return "OFFLINE";
        default:                          return "UNKNOWN";
    }
}


