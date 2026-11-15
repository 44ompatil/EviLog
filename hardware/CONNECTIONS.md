# EviLog Hardware — Connections Reference

**Board:** ESP32 DevKit V1 (ESP32-WROOM-32, 30-pin)  
**Project:** EviLog Evidence Tracking System  
**Firmware:** PlatformIO / Arduino Framework

---

## ⚡ Power Notes

- ESP32 is powered via **USB** from laptop during development.
- MFRC522 and LCD run on **3.3V** from the ESP32's 3V3 pin.
- SG90 Servo requires **5V** (use the ESP32 DevKit's VIN or a separate 5V supply).
- LEDs require **220Ω resistors** in series to limit current.
- Active Buzzer: driven directly from GPIO33 (5–12mA, within ESP32 GPIO limit).

---

## 📌 Pin Summary Table

| Component | Signal | ESP32 GPIO | Physical Pin | Wire Color (suggested) |
|---|---|---|---|---|
| **MFRC522 RFID** | SDA (SS) | GPIO 5 | D5 | Yellow |
| **MFRC522 RFID** | SCK | GPIO 18 | D18 | Orange |
| **MFRC522 RFID** | MOSI | GPIO 23 | D23 | Blue |
| **MFRC522 RFID** | MISO | GPIO 19 | D19 | Green |
| **MFRC522 RFID** | RST | GPIO 27 | D27 | White |
| **MFRC522 RFID** | 3.3V | 3V3 | 3V3 | Red |
| **MFRC522 RFID** | GND | GND | GND | Black |
| **LCD 16×2 (I2C)** | SDA | GPIO 21 | D21 | Green |
| **LCD 16×2 (I2C)** | SCL | GPIO 22 | D22 | Blue |
| **LCD 16×2 (I2C)** | VCC | 5V | VIN | Red |
| **LCD 16×2 (I2C)** | GND | GND | GND | Black |
| **SG90 Servo** | Signal | GPIO 13 | D13 | Orange |
| **SG90 Servo** | VCC | 5V | VIN | Red |
| **SG90 Servo** | GND | GND | GND | Black |
| **Green LED** | Anode (+) | GPIO 26 | D26 | Green |
| **Green LED** | Cathode (−) | GND (via 220Ω) | GND | Black |
| **Red LED** | Anode (+) | GPIO 25 | D25 | Red |
| **Red LED** | Cathode (−) | GND (via 220Ω) | GND | Black |
| **Active Buzzer** | + (positive) | GPIO 33 | D33 | White |
| **Active Buzzer** | − (negative) | GND | GND | Black |

---

## 🔌 Detailed Component Wiring

### 1. MFRC522 RFID Reader (SPI)

```
MFRC522 Module        ESP32 DevKit V1
─────────────         ─────────────────
SDA  ────────────────► GPIO 5  (D5)   [SS / Chip Select]
SCK  ────────────────► GPIO 18 (D18)  [SPI Clock]
MOSI ────────────────► GPIO 23 (D23)  [SPI Master Out]
MISO ◄────────────────  GPIO 19 (D19)  [SPI Master In]
RST  ────────────────► GPIO 27 (D27)  [Reset]
3.3V ────────────────► 3V3            [Power — 3.3V ONLY, NOT 5V]
GND  ────────────────► GND            [Ground]
```

> **⚠️ WARNING**: MFRC522 is a 3.3V device. Connecting to 5V WILL damage it.

The MFRC522 reads **13.56 MHz** cards/tags (such as MIFARE Classic); it cannot read
125 kHz proximity cards. If tapping a compatible card does nothing, open the Serial
Monitor at 115200 baud. `[RFID] Firmware version: 0x00` or `0xFF` indicates an SPI,
power, or wiring issue. A valid version followed by `[RFID] Waiting for a 13.56 MHz
card...` means initialization succeeded but no card is being detected. Check the
pin mapping above, use 3.3V power, and place the card flat against the reader antenna.

### 2. LCD 16×2 with I2C Backpack (PCF8574)

```
I2C LCD Module        ESP32 DevKit V1
──────────────        ─────────────────
SDA  ────────────────► GPIO 21 (D21)  [I2C Data]
SCL  ────────────────► GPIO 22 (D22)  [I2C Clock]
VCC  ────────────────► 5V (VIN)       [LCD needs 5V for brightness]
GND  ────────────────► GND
```

> **I2C Address**: Default is `0x27`. If LCD doesn't display, try `0x3F`.  
> Change `LCD_I2C_ADDR` in `hardware_pins.h` if needed.

### 3. SG90 Servo Motor

```
SG90 Servo (3-wire)   ESP32 DevKit V1
───────────────────   ─────────────────
Orange (Signal) ────► GPIO 13 (D13)  [PWM signal — 50Hz]
Red    (VCC)    ────► 5V (VIN)       [Servo needs 5V, not 3.3V]
Brown  (GND)    ────► GND
```

> **Note**: SG90 may cause voltage drops when moving under load. Use a capacitor (100µF/10V) across the servo's VCC and GND if the ESP32 resets during servo movement.

### 4. Green LED (Access Granted)

```
GPIO 26 ──[220Ω]──► LED Anode (+) ──► LED Cathode (−) ──► GND
```

### 5. Red LED (Access Denied)

```
GPIO 25 ──[220Ω]──► LED Anode (+) ──► LED Cathode (−) ──► GND
```

### 6. Active Buzzer

```
GPIO 33 ────────────► Buzzer (+) [HIGH = ON]
GND     ────────────► Buzzer (−)
```

> **Active vs. Passive Buzzer**: Active buzzer has built-in oscillator — it beeps when GPIO is HIGH. Passive buzzer requires `tone()` for frequency control. This firmware uses active buzzer.

---

## 🗂️ RFID SPI Bus — Important Notes

The MFRC522 RFID reader uses the SPI bus on GPIO 18/19/23.

**Initialization**:
```
SPI.begin(18, 19, 23, 5)   ← RFID SS as default CS during SPI init
rfid.PCD_Init()             ← Init RFID on the bus
```

---

## 🔋 Power Supply Diagram

```
USB (5V) → ESP32 DevKit VIN (5V rail)
                │
                ├──► Servo VCC (5V)
                ├──► LCD VCC (5V)
                │
ESP32 3V3 out ──┤
                ├──► MFRC522 3.3V
                ├──► (I2C pullups — usually on-module)
                │
ESP32 GND ──────► All component GNDs (common ground)
```

---

## 🧪 Quick Continuity Check

Before powering on, verify with a multimeter:
1. No short between 3.3V and GND
2. No short between 5V and GND
3. MFRC522 VCC connected to 3.3V (not 5V!)
4. All GNDs connected to ESP32 GND

---

## 📐 Fritzing / Wokwi Simulation

The Wokwi simulation in `module testing/RfID Testing/diagram.json` shows the RFID and LCD setup. The servo, buzzer, and LEDs are not represented in that simulation.

