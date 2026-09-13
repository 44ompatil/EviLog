#include <Wire.h>
#include <SPI.h>
#include <MFRC522.h>
#include <SD.h>
#include <LiquidCrystal_I2C.h>

constexpr uint8_t RFID_SS = 5;
constexpr uint8_t RFID_RST = 27;
constexpr uint8_t SD_CS = 13;
constexpr uint8_t GREEN_LED = 25;
constexpr uint8_t RED_LED = 26;
constexpr uint8_t BUZZER = 33;

MFRC522 rfid(RFID_SS, RFID_RST);
LiquidCrystal_I2C lcd(0x27, 16, 2);

void screen(const String& line1, const String& line2) {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(line1);
  lcd.setCursor(0, 1); lcd.print(line2);
}

String uidText() {
  String uid;
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (i) uid += ":";
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

void writeLog(const String& uid, const String& event) {
  File log = SD.open("/evilog.csv", FILE_APPEND);
  if (!log) { Serial.println("SD_LOG_OPEN_FAILED"); return; }
  log.println("2026-09-13,Locker-A," + uid + "," + event + ",Officer-01");
  log.close();
}

void setup() {
  Serial.begin(115200);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  lcd.init(); lcd.backlight();
  screen("EviLog starting", "RFID + SD");

  SPI.begin(18, 19, 23, RFID_SS);
  rfid.PCD_Init();
  if (!SD.begin(SD_CS)) {
    screen("SD card error", "Check wiring");
    Serial.println("SD_INIT_FAILED");
    return;
  }
  if (!SD.exists("/evilog.csv")) {
    File log = SD.open("/evilog.csv", FILE_WRITE);
    log.println("timestamp,location,evidence_uid,event,handler");
    log.close();
  }
  screen("EviLog ready", "Tap RFID card");
  Serial.println("SYSTEM_READY");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;
  String uid = uidText();
  bool allowed = uid == "01:02:03:04";
  String event = allowed ? "CHECK_IN" : "UNKNOWN_TAG";
  digitalWrite(GREEN_LED, allowed);
  digitalWrite(RED_LED, !allowed);
  tone(BUZZER, allowed ? 1800 : 500, allowed ? 120 : 500);
  screen(allowed ? "CHECK IN OK" : "UNAUTHORISED", uid);
  writeLog(uid, event);
  Serial.println(uid + "," + event + ",logged_to_SD");
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1000);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  screen("EviLog ready", "Tap RFID card");
}