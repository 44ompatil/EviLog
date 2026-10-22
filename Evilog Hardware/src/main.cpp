#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal_I2C.h>
#include "RTClib.h"
#include "esp_camera.h"
#include "esp_http_server.h"
#include "img_converters.h"

// ============================================================================
// EviLog Hardware Firmware - AI-Thinker ESP32-CAM
// Pin Mapping Table:
//   RFID-RC522:
//     SDA (SS)   -> GPIO 4
//     SCK        -> GPIO 14
//     MOSI       -> GPIO 15
//     MISO       -> GPIO 2
//     RST        -> GPIO 5
//   RTC (DS3231):
//     SDA        -> GPIO 12  (Shared I2C)
//     SCL        -> GPIO 13  (Shared I2C)
//   LCD (16x2 I2C):
//     SDA        -> GPIO 12  (Shared I2C)
//     SCL        -> GPIO 13  (Shared I2C)
//   Camera (RHYX M21-45):
//     Integrated FPC socket / SCCB I2C (GPIO 22/23/26/27)
// ============================================================================

// --- PIN DEFINITIONS ---
// RFID Pins (SPI)
constexpr uint8_t PIN_RFID_SS   = 4;   // SDA pin on RC522
constexpr uint8_t PIN_RFID_SCK  = 14;  // SCK pin on RC522
constexpr uint8_t PIN_RFID_MOSI = 15;  // MOSI pin on RC522
constexpr uint8_t PIN_RFID_MISO = 2;   // MISO pin on RC522
constexpr uint8_t PIN_RFID_RST  = 5;   // RST pin on RC522

// I2C Pins (Shared between DS3231 RTC & I2C LCD)
constexpr uint8_t PIN_I2C_SDA   = 12;
constexpr uint8_t PIN_I2C_SCL   = 13;

// Camera AI-Thinker Pinout (RHYX M21-45)
constexpr int kCameraPwdnPin    = 32;
constexpr int kCameraResetPin   = -1;
constexpr int kCameraXclkPin    = 0;
constexpr int kCameraSiodPin    = 26;
constexpr int kCameraSiocPin    = 27;
constexpr int kCameraY9Pin      = 35;
constexpr int kCameraY8Pin      = 34;
constexpr int kCameraY7Pin      = 39;
constexpr int kCameraY6Pin      = 36;
constexpr int kCameraY5Pin      = 21;
constexpr int kCameraY4Pin      = 19;
constexpr int kCameraY3Pin      = 18;
constexpr int kCameraY2Pin      = 5;
constexpr int kCameraVsyncPin   = 25;
constexpr int kCameraHrefPin    = 23;
constexpr int kCameraPclkPin    = 22;

// --- NETWORK CONFIGURATION ---
constexpr char kWifiApSsid[]     = "";
constexpr char kWifiApPassword[] = "";

// --- GLOBAL OBJECTS ---
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);
RTC_DS3231 rtc;
LiquidCrystal_I2C lcd(0x27, 16, 2); // Default address 0x27, will auto-probe if 0x3F
httpd_handle_t cameraServer = nullptr;

// --- SYSTEM STATE ---
bool gLcdFound = false;
bool gRtcFound = false;
bool gCameraFound = false;
uint8_t gLcdAddress = 0x27;

String gLastScannedUid = "None";
String gLastScannedTime = "--:--:--";
String gLastScanStatus = "Ready";
uint32_t gTotalScans = 0;
unsigned long gLastLcdUpdateTime = 0;
unsigned long gScanDisplayUntil = 0;

// --- FORWARD DECLARATIONS ---
bool initializeI2C();
bool initializeRtc();
bool initializeLcd();
bool initializeRfid();
bool initializeCamera();
bool startWebServer();
String getCurrentTimeString();
String getCurrentDateString();
void updateLcdScreen();
void handleRfidScan();

// --- WEB INTERFACE HTML ---
constexpr char kIndexHtml[] = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EviLog Hardware Station</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --accent: #38bdf8;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --success: #22c55e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 1.5rem;
    }
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .header h1 {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: -0.5px;
    }
    .header p {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 0.3rem;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      max-width: 900px;
      margin: 0 auto;
    }
    @media (min-width: 768px) {
      .grid { grid-template-columns: 1.2fr 0.8fr; }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .card h2 {
      font-size: 1.1rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--accent);
    }
    .stream-container {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      background: #000;
      aspect-ratio: 4 / 3;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stream-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .stat-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .stat-label { color: var(--text-muted); font-size: 0.88rem; }
    .stat-value { font-weight: 600; font-family: monospace; font-size: 0.95rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(34, 197, 94, 0.15);
      color: var(--success);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .refresh-hint {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      margin-top: 1.5rem;
    }
  </style>
  <script>
    setInterval(async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          document.getElementById('uid').innerText = data.last_uid;
          document.getElementById('time').innerText = data.rtc_time;
          document.getElementById('scans').innerText = data.total_scans;
          document.getElementById('status').innerText = data.status;
          document.getElementById('uptime').innerText = data.uptime_sec + 's';
        }
      } catch (e) {}
    }, 1500);
  </script>
</head>
<body>
  <div class="header">
    <h1>EviLog Smart Evidence Station</h1>
    <p>Chain-of-Custody & Evidence Logging Terminal</p>
  </div>
  <div class="grid">
    <div class="card">
      <h2>Live Camera Feed <span class="badge">RHYX M21-45</span></h2>
      <div class="stream-container">
        <img src="/stream" alt="Live Stream">
      </div>
    </div>
    <div class="card">
      <h2>Hardware Status <span class="badge">ONLINE</span></h2>
      <div class="stat-list">
        <div class="stat-item">
          <span class="stat-label">Last Scanned RFID</span>
          <span class="stat-value" id="uid" style="color: #38bdf8;">--</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Scan Timestamp</span>
          <span class="stat-value" id="time">--:--:--</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Last Event</span>
          <span class="stat-value" id="status">Ready</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Tag Scans</span>
          <span class="stat-value" id="scans">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">System Uptime</span>
          <span class="stat-value" id="uptime">0s</span>
        </div>
      </div>
    </div>
  </div>
  <p class="refresh-hint">EviLog Embedded Hardware Platform | Connected to AI-Thinker ESP32-CAM</p>
</body>
</html>
)rawliteral";

// --- I2C INITIALIZATION & AUTO-DETECTION ---
bool initializeI2C() {
  Serial.printf("[I2C] Initializing Wire bus on SDA: GPIO %d, SCL: GPIO %d...\n",
                PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 100000); // 100kHz standard mode
  delay(100);

  // Probe I2C Bus for LCD (usually 0x27 or 0x3F) and DS3231 (0x68)
  Serial.println("[I2C] Scanning bus...");
  bool foundLcd = false;
  bool foundRtc = false;

  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("[I2C] Device found at 0x%02X\n", addr);
      if (addr == 0x27 || addr == 0x3F) {
        gLcdAddress = addr;
        foundLcd = true;
      } else if (addr == 0x68) {
        foundRtc = true;
      }
    }
  }

  gLcdFound = foundLcd;
  gRtcFound = foundRtc;
  return true;
}

// --- RTC INITIALIZATION ---
bool initializeRtc() {
  if (!gRtcFound) {
    Serial.println("[RTC] DS3231 not detected on I2C scan. Attempting rtc.begin()...");
  }
  if (!rtc.begin(&Wire)) {
    Serial.println("[RTC] Error: DS3231 RTC not responding.");
    gRtcFound = false;
    return false;
  }

  gRtcFound = true;
  Serial.println("[RTC] DS3231 RTC initialized successfully.");

  if (rtc.lostPower()) {
    Serial.println("[RTC] RTC lost power or newly connected! Setting compile time...");
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  DateTime now = rtc.now();
  Serial.printf("[RTC] Current Time: %04d-%02d-%02d %02d:%02d:%02d\n",
                now.year(), now.month(), now.day(),
                now.hour(), now.minute(), now.second());
  return true;
}

// --- LCD INITIALIZATION ---
bool initializeLcd() {
  if (!gLcdFound) {
    Serial.println("[LCD] No I2C LCD detected at 0x27 or 0x3F. Continuing in headless mode.");
    return false;
  }

  Serial.printf("[LCD] Initializing LCD at address 0x%02X...\n", gLcdAddress);
  lcd = LiquidCrystal_I2C(gLcdAddress, 16, 2);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("EviLog Terminal");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  return true;
}

// --- RFID INITIALIZATION ---
bool initializeRfid() {
  Serial.printf("[RFID] Initializing SPI on SCK:%d MISO:%d MOSI:%d SS:%d RST:%d...\n",
                PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS, PIN_RFID_RST);
  SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
  delay(50);

  rfid.PCD_Init();
  delay(50);

  byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.printf("[RFID] RC522 Firmware Version: 0x%02X\n", version);

  if (version == 0x00 || version == 0xFF) {
    Serial.println("[RFID] WARNING: RC522 not responding. Check SPI wiring (GPIO 4, 14, 15, 2, 5).");
    return false;
  }

  Serial.println("[RFID] RC522 RFID reader initialized successfully.");
  return true;
}

// --- CAMERA INITIALIZATION (RHYX M21-45 / AI-THINKER) ---
bool initializeCamera() {
  Serial.println("[CAMERA] Configuring RHYX M21-45 camera...");
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = kCameraY2Pin;
  config.pin_d1       = kCameraY3Pin;
  config.pin_d2       = kCameraY4Pin;
  config.pin_d3       = kCameraY5Pin;
  config.pin_d4       = kCameraY6Pin;
  config.pin_d5       = kCameraY7Pin;
  config.pin_d6       = kCameraY8Pin;
  config.pin_d7       = kCameraY9Pin;
  config.pin_xclk     = kCameraXclkPin;
  config.pin_pclk     = kCameraPclkPin;
  config.pin_vsync    = kCameraVsyncPin;
  config.pin_href     = kCameraHrefPin;
  config.pin_sccb_sda = kCameraSiodPin;
  config.pin_sccb_scl = kCameraSiocPin;
  config.pin_pwdn     = kCameraPwdnPin;
  config.pin_reset    = kCameraResetPin;
  config.xclk_freq_hz = 20000000;
  // RHYX M21-45 lacks hardware JPEG, so we use RGB565 and frame2jpg conversion
  config.pixel_format = PIXFORMAT_RGB565;
  config.frame_size   = FRAMESIZE_QVGA;
  config.fb_count     = 1;
  config.fb_location  = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;

  const esp_err_t result = esp_camera_init(&config);
  if (result != ESP_OK) {
    Serial.printf("[CAMERA] Camera init failed: %s (0x%x). Continuing...\n",
                  esp_err_to_name(result), result);
    gCameraFound = false;
    return false;
  }

  gCameraFound = true;
  Serial.println("[CAMERA] RHYX M21-45 initialized successfully.");
  return true;
}

// --- HTTP SERVER HANDLERS ---
esp_err_t indexHandler(httpd_req_t *request) {
  httpd_resp_set_type(request, "text/html; charset=utf-8");
  return httpd_resp_send(request, kIndexHtml, HTTPD_RESP_USE_STRLEN);
}

esp_err_t streamHandler(httpd_req_t *request) {
  if (!gCameraFound) {
    httpd_resp_set_type(request, "text/plain");
    return httpd_resp_send_500(request);
  }

  httpd_resp_set_type(request, "multipart/x-mixed-replace;boundary=frame");
  httpd_resp_set_hdr(request, "Cache-Control", "no-cache");

  while (true) {
    camera_fb_t *frame = esp_camera_fb_get();
    if (!frame) {
      Serial.println("[STREAM] Frame capture error.");
      return httpd_resp_send_500(request);
    }

    uint8_t *jpegBuffer = nullptr;
    size_t jpegLength = 0;
    const bool converted = frame2jpg(frame, 75, &jpegBuffer, &jpegLength);
    esp_camera_fb_return(frame);

    if (!converted || !jpegBuffer) {
      free(jpegBuffer);
      Serial.println("[STREAM] Frame conversion to JPEG failed.");
      return httpd_resp_send_500(request);
    }

    char partHeader[96];
    const int headerLength = snprintf(
        partHeader, sizeof(partHeader),
        "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n",
        static_cast<unsigned>(jpegLength));

    esp_err_t result = httpd_resp_send_chunk(request, partHeader, headerLength);
    if (result == ESP_OK) {
      result = httpd_resp_send_chunk(
          request, reinterpret_cast<const char *>(jpegBuffer), jpegLength);
    }
    if (result == ESP_OK) {
      result = httpd_resp_send_chunk(request, "\r\n", 2);
    }
    free(jpegBuffer);

    if (result != ESP_OK) {
      return result;
    }
    taskYIELD();
  }
}

esp_err_t captureHandler(httpd_req_t *request) {
  if (!gCameraFound) {
    return httpd_resp_send_500(request);
  }

  camera_fb_t *frame = esp_camera_fb_get();
  if (!frame) {
    return httpd_resp_send_500(request);
  }

  uint8_t *jpegBuffer = nullptr;
  size_t jpegLength = 0;
  const bool converted = frame2jpg(frame, 80, &jpegBuffer, &jpegLength);
  esp_camera_fb_return(frame);

  if (!converted || !jpegBuffer) {
    free(jpegBuffer);
    return httpd_resp_send_500(request);
  }

  httpd_resp_set_type(request, "image/jpeg");
  httpd_resp_set_hdr(request, "Content-Disposition", "inline; filename=capture.jpg");
  esp_err_t res = httpd_resp_send(request, (const char *)jpegBuffer, jpegLength);
  free(jpegBuffer);
  return res;
}

esp_err_t statusApiHandler(httpd_req_t *request) {
  char jsonBuffer[256];
  snprintf(jsonBuffer, sizeof(jsonBuffer),
           "{\"last_uid\":\"%s\",\"rtc_time\":\"%s %s\",\"status\":\"%s\",\"total_scans\":%u,\"uptime_sec\":%lu}",
           gLastScannedUid.c_str(),
           getCurrentDateString().c_str(),
           getCurrentTimeString().c_str(),
           gLastScanStatus.c_str(),
           gTotalScans,
           millis() / 1000);

  httpd_resp_set_type(request, "application/json");
  httpd_resp_set_hdr(request, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(request, jsonBuffer, HTTPD_RESP_USE_STRLEN);
}

bool startWebServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  esp_err_t result = httpd_start(&cameraServer, &config);
  if (result != ESP_OK) {
    Serial.printf("[HTTP] Failed to start server: %s\n", esp_err_to_name(result));
    return false;
  }

  httpd_uri_t indexUri = {
    .uri = "/",
    .method = HTTP_GET,
    .handler = indexHandler,
    .user_ctx = nullptr
  };
  httpd_register_uri_handler(cameraServer, &indexUri);

  httpd_uri_t streamUri = {
    .uri = "/stream",
    .method = HTTP_GET,
    .handler = streamHandler,
    .user_ctx = nullptr
  };
  httpd_register_uri_handler(cameraServer, &streamUri);

  httpd_uri_t captureUri = {
    .uri = "/capture",
    .method = HTTP_GET,
    .handler = captureHandler,
    .user_ctx = nullptr
  };
  httpd_register_uri_handler(cameraServer, &captureUri);

  httpd_uri_t statusUri = {
    .uri = "/api/status",
    .method = HTTP_GET,
    .handler = statusApiHandler,
    .user_ctx = nullptr
  };
  httpd_register_uri_handler(cameraServer, &statusUri);

  Serial.println("[HTTP] Web server started on port 80.");
  return true;
}

// --- UTILITY TIME FUNCTIONS ---
String getCurrentTimeString() {
  if (gRtcFound) {
    DateTime now = rtc.now();
    char buf[12];
    snprintf(buf, sizeof(buf), "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
    return String(buf);
  }
  unsigned long s = millis() / 1000;
  char buf[12];
  snprintf(buf, sizeof(buf), "%02lu:%02lu:%02lu", (s / 3600) % 24, (s / 60) % 60, s % 60);
  return String(buf);
}

String getCurrentDateString() {
  if (gRtcFound) {
    DateTime now = rtc.now();
    char buf[12];
    snprintf(buf, sizeof(buf), "%04d-%02d-%02d", now.year(), now.month(), now.day());
    return String(buf);
  }
  return "2026-10-18";
}

// --- LCD DISPLAY REFRESH ---
void updateLcdScreen() {
  if (!gLcdFound) return;

  // If showing a scan result, keep it visible until timeout
  if (millis() < gScanDisplayUntil) {
    return;
  }

  // Normal Idle Screen:
  // Line 0: "EviLog  HH:MM:SS"
  // Line 1: "Tap RFID Card..."
  lcd.setCursor(0, 0);
  lcd.print("EviLog  ");
  lcd.print(getCurrentTimeString());

  lcd.setCursor(0, 1);
  lcd.print("Tap RFID Card   ");
}

// --- RFID READ & DISPATCH ---
void handleRfidScan() {
  // Check for new card
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Format Card UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i > 0) uid += ":";
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  gLastScannedUid = uid;
  gLastScannedTime = getCurrentTimeString();
  gLastScanStatus = "TAG_RECORDED";
  gTotalScans++;

  // Log to Serial in Structured JSON format for Backend / PC logging
  String jsonPayload = String("{\"event\":\"RFID_SCANNED\",\"device_id\":\"EVILOG-001\",")
                     + "\"uid\":\"" + uid + "\","
                     + "\"date\":\"" + getCurrentDateString() + "\","
                     + "\"time\":\"" + gLastScannedTime + "\","
                     + "\"scan_count\":" + String(gTotalScans) + "}";
  Serial.println(jsonPayload);

  // Update LCD with scan event
  if (gLcdFound) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("TAG: ");
    lcd.print(uid.substring(0, 11)); // Fit on 16 chars

    lcd.setCursor(0, 1);
    lcd.print("LOG ");
    lcd.print(gLastScannedTime);
    lcd.print(" OK");
  }

  // Keep scan display on LCD for 2.5 seconds
  gScanDisplayUntil = millis() + 2500;

  // Halt card and stop encryption
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// --- MAIN SETUP ---
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n===========================================");
  Serial.println("   EviLog Hardware Terminal - Starting...   ");
  Serial.println("===========================================");

  // 1. Initialize Shared I2C Bus (DS3231 RTC & LCD 16x2 on GPIO 12 & 13)
  initializeI2C();
  initializeLcd();
  initializeRtc();

  if (gLcdFound) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("EviLog Terminal");
    lcd.setCursor(0, 1);
    lcd.print("Connecting WiFi");
  }

  // 2. Initialize RFID RC522 (SPI on GPIO 4, 14, 15, 2, 5)
  initializeRfid();

  // 3. Initialize Camera (RHYX M21-45)
  initializeCamera();

  // 4. Start Wi-Fi Access Point
  WiFi.mode(WIFI_AP);
  const IPAddress apIp(192, 168, 4, 1);
  WiFi.softAPConfig(apIp, apIp, IPAddress(255, 255, 255, 0));
  if (WiFi.softAP(kWifiApSsid, kWifiApPassword, 1, false, 4)) {
    Serial.printf("[WIFI] Access Point active: SSID: %s | Pass: %s\n",
                  kWifiApSsid, kWifiApPassword);
    Serial.printf("[WIFI] Station Web UI: http://%s/\n", WiFi.softAPIP().toString().c_str());
  } else {
    Serial.println("[WIFI] Failed to start SoftAP.");
  }

  // 5. Start Web Server
  startWebServer();

  if (gLcdFound) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("EviLog Ready");
    lcd.setCursor(0, 1);
    lcd.print("IP: 192.168.4.1");
    delay(1500);
  }

  Serial.println("[EviLog] System ready. Listening for RFID tags...");
}

// --- MAIN LOOP ---
void loop() {
  // 1. Poll RFID Reader
  handleRfidScan();

  // 2. Refresh LCD Clock Display every 1 second
  if (millis() - gLastLcdUpdateTime >= 1000) {
    gLastLcdUpdateTime = millis();
    updateLcdScreen();
  }

  delay(20);
}
