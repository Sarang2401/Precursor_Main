# 🧪 PRECURSOR – Complete Client Testing Guide (Windows)

> **Version:** 1.0 | **Last Updated:** Feb 10, 2026
>
> This document is a **step-by-step walkthrough** for testing every feature of the **Precursor Pharmaceutical Supply Chain Tracking System** on a Windows machine.

---

## 📋 Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Starting the System (3 Terminals)](#2-starting-the-system-3-terminals)
3. [Login & Authentication](#3-login--authentication)
4. [Manufacturer Features](#4-manufacturer-features)
5. [Driver Features](#5-driver-features)
6. [Regulator Features](#6-regulator-features)
7. [ML / IoT Pipeline](#7-ml--iot-pipeline)
8. [Blockchain Verification](#8-blockchain-verification)
9. [Shipment State Machine](#9-shipment-state-machine)
10. [PDF Compliance Reports](#10-pdf-compliance-reports)
11. [End-to-End Full Flow Test](#11-end-to-end-full-flow-test)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites & Setup

### 1.1 Required Software

| Software | Minimum Version | How to Check |
|----------|----------------|--------------|
| **Node.js** | 18+ | Open PowerShell → type `node --version` |
| **npm** | 9+ | `npm --version` |
| **Python** | 3.9+ | `python --version` |
| **pip** | 21+ | `pip --version` |
| **Web Browser** | Chrome / Edge (latest) | Any modern browser works |

> **Don't have them?**
> - Node.js: Download from https://nodejs.org (LTS version)
> - Python: Download from https://www.python.org/downloads/

### 1.2 One-Time Installation

Open **3 separate PowerShell windows** and run these commands:

**PowerShell 1 — Backend:**
```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\precursor-backend
npm install
```

**PowerShell 2 — Frontend:**
```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\precursor-frontend
npm install
```

**PowerShell 3 — ML Backend:**
```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\ML\backend
pip install -r requirements.txt
```

Wait for all 3 to finish before proceeding.

---

## 2. Starting the System (3 Terminals)

**IMPORTANT: Start them in this exact order.** Keep all 3 terminals open throughout testing.

### Terminal 1 — Node.js Backend API (Port 3000)

```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\precursor-backend
node server.js
```

**✅ You should see:**
```
📦 Initializing database...
✅ Database tables ready (with migrations)
🛰️  GPS simulation started (5000ms interval)

🚀 ========================================
   PRECURSOR Backend Running
   Local:    http://localhost:3000
========================================
```

### Terminal 2 — React Native Frontend (Port 8081)

```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\precursor-frontend
npx expo start --web
```

**✅ You should see:**
Your default browser opens at `http://localhost:8081` showing the **Precursor Login** screen.

> If the browser doesn't open automatically, manually visit `http://localhost:8081`

### Terminal 3 — ML/AI Backend (Port 5000)

```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\ML\backend
python app.py
```

**✅ You should see:**
```
✅ Loaded XX route points from ...
 * Running on http://0.0.0.0:5000
```

> **⚠️ Note:** If you see TensorFlow warnings, don't worry — they are normal and don't affect functionality.

---

## 3. Login & Authentication

Open your browser → go to `http://localhost:8081`

### 3.1 Quick Login (Recommended for Testing)

At the bottom of the login screen, you'll see **3 colored buttons** for quick login:

| Button | Role | What it does |
|--------|------|-------------|
| 🔵 **Manufacturer** | Logs in as `manufacturer` | Goes to Manufacturer Dashboard |
| 🟢 **Driver** | Logs in as `driver` | Goes to Driver Dashboard |
| 🟠 **Regulator** | Logs in as `regulator` | Goes to Regulator Dashboard |

**Test:** Click any button → you should be redirected to that role's dashboard immediately.

### 3.2 Manual Login

You can also type credentials manually:

| Role | Username | Password |
|------|----------|----------|
| Manufacturer | `manufacturer` | `manu123` |
| Driver | `driver` | `driver123` |
| Regulator | `regulator` | `reg123` |

**Test Steps:**
1. Type `manufacturer` in the Username field
2. Type `manu123` in the Password field
3. Click **Login**
4. ✅ **Expected:** Redirected to Manufacturer Dashboard

### 3.3 Invalid Login Test

1. Type `wronguser` in Username, `wrongpass` in Password
2. Click **Login**
3. ✅ **Expected:** Red error message "Invalid credentials" appears

### 3.4 Logout

1. Click the red **Logout** button (top-left corner of any dashboard)
2. ✅ **Expected:** Redirected back to Login screen

---

## 4. Manufacturer Features

> **Login as:** Click the 🔵 **Manufacturer** quick-login button

### 4.1 View Dashboard

**What you see on the dashboard:**
- Blue header bar with "MANUFACTURER" title
- **Stats Card** showing Active / Total shipment counts
- **Recent Shipments** list with status badges
- Each shipment has **Dispatch** (orange) and **QR** (blue) buttons

✅ **Expected:** Shipments load from the database. Each shows Product ID, origin, destination, quantity, and creation date.

---

### 4.2 Create a New Shipment

1. Click the **"+"** button in the top-right corner of the header
2. The **Create Shipment** form opens

3. Fill in the form fields:

| Field | Example Value | Notes |
|-------|---------------|-------|
| Product ID | `TEST-CHEM-001` | Unique identifier for the product |
| Chemical Name | Select from dropdown | e.g., Ephedrine, Pseudoephedrine |
| Regulatory Class | Select from dropdown | e.g., Table I, Controlled |
| Quantity | `50` | Numeric value |
| Unit | `kg` | Weight unit |
| Origin | `Mumbai Warehouse` | Where the shipment starts |
| Destination | `Pune Hospital` | Where the shipment goes |

4. Click **Create Shipment**

✅ **Expected:**
- Green success message appears
- New shipment appears in the dashboard list
- Status shows **CREATED** (green badge)
- Auto-generated values:
  - **Chemical URN:** e.g., `URN:NCB:PREC:2026:MAN001:XXXXXX`
  - **Batch ID:** e.g., `BATCH-XXXXXXXX`

---

### 4.3 Dispatch a Shipment

This transitions a shipment from **CREATED → DISPATCHED**.

1. Find a shipment with **CREATED** status in the list
2. Click the orange **"Dispatch"** button next to it
3. A confirmation popup appears → Click **Yes**

✅ **Expected:**
- Green success banner: `"✅ TEST-CHEM-001 dispatched successfully!"`
- Status badge changes from CREATED → **DISPATCHED**
- Orange Dispatch button changes to a green **"Sent ✓"** badge
- In Terminal 1 (backend), you'll see: `📦 State Transition: CREATED → DISPATCHED by manufacturer`

> **⚠️ IMPORTANT:** Shipments MUST be dispatched before the driver can scan checkpoints!

---

### 4.4 View QR Code

1. Click the blue **"QR"** button next to any shipment
2. A modal popup opens

✅ **Expected: The QR Code modal shows:**
- A scannable QR code image
- Product ID
- Chemical URN
- Batch ID
- Route (Origin → Destination)
- Instructions: "Print this QR code and attach to the shipment package"

3. Click **Close** to dismiss the modal

---

## 5. Driver Features

> **Login as:** Click the 🟢 **Driver** quick-login button

### 5.1 View Driver Dashboard

**What you see:**
- Blue header bar with "DRIVER DASHBOARD"
- **Active Shipments** section with shipment cards
- Each card shows: Product ID, origin → destination, status, and action buttons

✅ **Expected:** Dispatched and in-transit shipments load from the database.

---

### 5.2 Scan QR at Checkpoint (Record Checkpoint)

> **Prerequisite:** The shipment must be in **DISPATCHED** or **IN_TRANSIT** state.
> If it's still CREATED, go back to Manufacturer and dispatch it first!

1. Click **"Scan QR at Checkpoint"** button (or the scan button on a shipment card)
2. The **QR Scanner** screen opens with:
   - Camera placeholder (physical camera needs dev build)
   - **Manual Entry** text field
   - **Quick Test** buttons: PHARMA-001, PHARMA-002, PHARMA-003

3. **To scan manually:** Type a Product ID (e.g., `TEST-CHEM-001`) in the text field
4. Click **🔍 Lookup Shipment**

✅ **Expected:** Shipment verification screen shows:
- Product ID, Chemical URN, Batch ID
- Route (Origin → Destination)
- Current Status and Weight

**If the shipment is in CREATED state:**
- ⚠️ Yellow warning banner: *"This shipment is in CREATED state. The manufacturer must DISPATCH it before you can scan checkpoints."*
- Confirm button is greyed out / disabled

**If the shipment is DISPATCHED or IN_TRANSIT:**

5. Click **"✓ Confirm & Record Checkpoint"**

✅ **Expected: Success screen showing:**
- ✅ "Checkpoint Recorded Successfully!"
- GPS Location (simulated Pune area coordinates, e.g., `18.5204, 73.8567`)
- Timestamp
- Weight reading
- "Digitally Signed: ✓ Yes" (RSA-SHA256 signature)
- If this is the first checkpoint: **"📦 State Changed: DISPATCHED → IN_TRANSIT"** (auto-transition)

---

### 5.3 GPS Live Tracking (GPS Hops)

1. From driver dashboard, click **"View GPS"** (or GPS icon) on a shipment card
2. The **GPS Tracking** screen opens

✅ **Expected:**
- Current GPS coordinates displayed (simulated Pune area)
- **Route Compliance Status:** ✅ On Route or ⚠️ Off Route
- GPS coordinates auto-update every **5 seconds** (watch the coordinates change!)
- List of GPS hops (history of position updates)

> The GPS simulation follows a pre-defined route through Pune. You can watch the coordinates change in real-time.

---

### 5.4 Shipment Control Panel

1. From driver dashboard, click on a shipment card itself (not a button)
2. The **Shipment Control** panel opens

✅ **Expected:**
- Full shipment details (ID, origin, destination, weight)
- Action buttons: Scan Checkpoint, View GPS, Report Issue
- Event history timeline

---

### 5.5 Tamper Detection (Raise Tamper Flag)

1. From the shipment control screen or driver dashboard, navigate to the **Tamper** page
2. You see the **Tamper Flag System** interface

3. Click the red **"🚩 Raise Tamper Flag"** button

✅ **Expected:**
- Alert confirmation: "🚩 Tamper Alert Raised!"
- Message: "A HIGH risk tampering alert has been sent to regulators"
- Red alert box appears: "⚠️ TAMPERING DETECTED! Alert sent to regulators"

4. To clear the flag: Click **"✓ Clear Flag"**

✅ **Expected:** Flag is cleared, red alert box disappears

> **What happens behind the scenes:** This creates a real **HIGH-risk alert** that shows up immediately on the Regulator's dashboard!

---

## 6. Regulator Features

> **Login as:** Click the 🟠 **Regulator** quick-login button

### 6.1 View Regulator Dashboard

**What you see:**
- Header with stats: Total Shipments, Active, Alerts count
- **Blockchain Chain Integrity** panel
- **Recent Alerts** section (ML anomalies + tamper flags)
- **All Shipments** list with ⬇️ download buttons
- **Daily Summary** button (orange)

✅ **Expected:** All data loads from backend in real-time. Pull down to refresh.

---

### 6.2 View ML Anomaly Alerts

1. From the regulator dashboard, scroll to the **Alerts** section (or navigate to Alerts tab)

✅ **Expected:**
- List of alerts sorted by time (newest first)
- Each alert shows:
  - **Device ID** (sensor identifier)
  - **Risk Level** (HIGH / LOW)
  - **Timestamp** (in Indian Standard Time)
  - **Alert Details** (e.g., high_temp, sensor_failure, route_deviation)
- Tamper alerts from driver also appear here as **HIGH** risk

> **No alerts showing?** You need to trigger the ML pipeline first — see [Section 7](#7-ml--iot-pipeline).

---

### 6.3 View Audit Trail

1. Navigate to **Audit Trail** from the dashboard navigation

✅ **Expected:**
- Complete chronological log of ALL system actions
- Each entry shows:
  - **User** who performed the action
  - **Role** (manufacturer / driver / regulator)
  - **Action** (CREATE_SHIPMENT, STATE_TRANSITION, CHECKPOINT_SCAN, LOGIN, etc.)
  - **Target** resource and ID
  - **Result** (success / failure)
  - **Timestamp**
- Filter buttons at the top to filter by event type (ALL, CHECKPOINT_SCAN, STATE_TRANSITION, etc.)

---

### 6.4 Blockchain Integrity Panel

On the regulator dashboard, look at the **Chain Integrity** section:

✅ **Expected:**
- **Total Events** count (number of blockchain events)
- **Signature Verification Rate** (percentage of events with valid signatures)
- **Chain Integrity Status:** ✅ "Intact" (or ⚠️ if issues detected)

---

### 6.5 Download Individual Shipment PDF Report

1. On the regulator dashboard, find a shipment in the "All Shipments" section
2. Click the **⬇️ download icon** next to that shipment

✅ **Expected:** A PDF file downloads containing:
- **Chemical Identity:** URN, Batch ID, Manufacturer URN
- **Shipment Details:** Origin, destination, weight, status
- **Full Event Chain:** Every checkpoint, state transition, with timestamps
- **Signature Verification Status** for each event
- **Weight Deviation Calculation**

---

### 6.6 Download Daily Summary Report

1. Look for the orange **"Daily Summary"** button near the "All Shipments" header
2. Click it

✅ **Expected:** A PDF file downloads containing:
- Date and time of report generation
- Total shipment count for the day
- Summary table of all shipments with status
- Alert summary

---

## 7. ML / IoT Pipeline

This section tests the **Machine Learning anomaly detection system** that processes sensor data from IoT devices via ThingSpeak.

### Architecture Overview
```
ThingSpeak Cloud (IoT Sensors)
       ↓
ML Backend (Python Flask, Port 5000)
  ├── Isolation Forest (anomaly detection)
  ├── LSTM Autoencoder (time-series analysis)
  └── Route Deviation Check (GPS)
       ↓
Node.js Backend (Port 3000) ← stores alerts
       ↓
Frontend Dashboard (Regulator sees alerts)
```

---

### 7.1 Quick ThingSpeak Connectivity Test

> Tests whether your system can communicate with the ThingSpeak IoT cloud.

**Open a NEW PowerShell window (Terminal 4):**

```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\ML\backend
python simulate_thingspeak.py --test
```

✅ **Expected Output:**
```
📡 PRECURSOR - ThingSpeak Sensor Simulator
🔌 THINGSPEAK QUICK TEST
Sending: temp=24.5°C, hum=48.2%, weight=95.3kg
✅ SUCCESS! Entry #XXX created
```

> **If it fails:** Check your internet connection. ThingSpeak requires internet access.

---

### 7.2 Send Manual Sensor Data to ML Engine

> Tests the ML inference engine directly, without ThingSpeak.

**In Terminal 4, run:**

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/sensor/manual" -Method POST -ContentType "application/json" -Body '{"temp": 25, "hum": 50, "weight": 95}'
```

✅ **Expected:** Response shows ML risk assessment:
```
status : ok
result : @{risk=Low; info=buffer warming; alerts=System.Object[]}
```

> The first 30 readings will show `"info": "warming_up"` because the LSTM model needs 30 data points to build its sliding window buffer. This is normal!

---

### 7.3 Trigger ML Anomaly Alerts (High Temperature)

Send abnormal sensor data to trigger alerts:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/sensor/manual" -Method POST -ContentType "application/json" -Body '{"temp": 42, "hum": 85, "weight": 0}'
```

✅ **Expected:**
- Risk level: **HIGH**
- Alerts include: `high_temp`, `sensor_failure` (weight = 0)
- Alert is saved to: `ML\backend\alerts\alerts_logs.jsonl`
- Alert is also forwarded to Node.js backend and stored in database

---

### 7.4 Send Multiple Normal Readings (Warm Up the ML Buffer)

The LSTM model needs **30 readings** to start making predictions. Run this to warm it up:

```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\ML\backend
python simulate_thingspeak.py --warmup 5
```

This sends 5 normal sensor readings to ThingSpeak (~80 seconds due to 15-second rate limit).

✅ **Expected:** 5 successful writes to ThingSpeak, each with an entry number.

---

### 7.5 Send Anomaly Readings to ThingSpeak

```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\ML\backend
python simulate_thingspeak.py --anomaly
```

This sends 3 anomaly scenarios to ThingSpeak:
1. **High temperature** (42°C)
2. **Zero weight** (sensor failure)
3. **Combined** (high temp + zero weight)

✅ **Expected:** 3 successful writes with anomaly data.

---

### 7.6 Full Automated Pipeline (ThingSpeak → ML → Dashboard)

> **⚠️ This takes ~10 minutes** due to ThingSpeak's 15-second rate limit.

```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\ML\backend
python simulate_and_poll.py
```

**What it does step by step:**
1. **Phase 1 (Warm-up):** Sends 30 normal readings to ThingSpeak (~8 minutes)
2. **Phase 2 (Anomaly):** Sends 3 anomaly readings to trigger alerts
3. After each write, auto-triggers the ML backend to process the data

✅ **Expected at the end:**
```
🎉 SUCCESS! Alerts should now appear on your dashboard!
   Refresh the 'ML Anomaly Alerts' page in your app.
```

**Verify:** Login as **Regulator** → Dashboard → Alerts section → You should see the new alerts!

---

### 7.7 Start ThingSpeak Auto-Poller (Background Service)

This keeps polling ThingSpeak every 60 seconds and feeding data to the ML engine:

```powershell
cd C:\Users\Lenovo\Desktop\Precursor_Main\ML\backend
python thingspeak_poller.py
```

✅ **Expected:**
```
🔄 ThingSpeak Auto-Poller Service
Polling ThingSpeak every 60 seconds
Press Ctrl+C to stop

[2026-02-10 19:30:00] Poll #1
   📡 ThingSpeak: temp=24.5°C, hum=48.2%, weight=95.3kg
   🧠 ML Backend: warming up buffer...
   📊 Total alerts generated: 0
```

Leave this running in the background to continuously monitor sensor data.

Press **Ctrl+C** to stop when done.

---

### 7.8 Trigger ThingSpeak Read from ML Backend (API Call)

If you've written data to ThingSpeak and want to manually trigger the ML backend to read it:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/sensor/thingspeak"
```

✅ **Expected:** ML processes the latest ThingSpeak reading and returns risk assessment.

---

### 7.9 View All ML Alerts (API)

**From ML Backend:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/regulator/alerts"
```

**From Node.js Backend:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/ml-alerts"
```

✅ **Expected:** JSON array of all alerts, newest first.

---

## 8. Blockchain Verification

### 8.1 Python Blockchain (ML Backend)

The ML backend has its own blockchain for recording sensor events.

**Add a Block:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/blockchain/add" -Method POST -ContentType "application/json" -Body '{"type":"sensor_alert","device_id":"SENSOR_001","data":{"temp":42,"risk":"HIGH"}}'
```

✅ **Expected:** Block added with SHA-256 hash and previous block hash linking.

**View Full Chain:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/blockchain/chain"
```

✅ **Expected:** Full chain with genesis block + all added blocks.

**Validate Chain Integrity:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/blockchain/validate"
```

✅ **Expected:** `valid: True, message: "Chain is valid"`

**View Blockchain Stats:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/blockchain/stats"
```

✅ **Expected:** Total blocks, genesis time, latest time, blocks by type.

---

### 8.2 Node.js Blockchain Status (Backend)

**Check Blockchain Status:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/blockchain/status"
```

✅ **Expected:**
```
totalEvents    : 25
signedEvents   : 23
signatureRate  : 92.00%
chainIntegrity : intact
```

---

### 8.3 View Event Chain for a Specific Shipment

First, get a shipment ID:
```powershell
$shipments = Invoke-RestMethod -Uri "http://localhost:3000/shipments"
$shipmentId = $shipments.shipments[0].id
Write-Host "Shipment ID: $shipmentId"
```

Then view its event chain:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/shipments/$shipmentId/chain"
```

✅ **Expected:** JSON showing:
- Shipment chemical identity (URN, Batch ID)
- Array of events (CREATED, STATE_TRANSITION, CHECKPOINT_SCAN, etc.)
- Each event has: type, actorId, actorRole, signature, timestamp
- `chainIntegrity: true` if all signatures verify

---

### 8.4 Verify Individual Event Signature

Get an event ID from the chain response above, then:
```powershell
$events = Invoke-RestMethod -Uri "http://localhost:3000/events"
$eventId = $events.events[0].id
Invoke-RestMethod -Uri "http://localhost:3000/api/events/$eventId/verify"
```

✅ **Expected:**
```
verified  : True
eventId   : <event-id>
actorRole : manufacturer
algorithm : RSA-SHA256
```

---

## 9. Shipment State Machine

### 9.1 State Diagram

```
CREATED ──→ DISPATCHED ──→ IN_TRANSIT ──→ DELIVERED ──→ CONSUMED
                ↕                ↕
            OFF_ROUTE        OFF_ROUTE
                                ↓
                             SEIZED (terminal - no way out)
```

### 9.2 Valid Transitions & Who Can Perform Them

| From | To | Allowed Role |
|------|----|-------------|
| CREATED | DISPATCHED | Manufacturer |
| DISPATCHED | IN_TRANSIT | Driver (auto on checkpoint scan) |
| IN_TRANSIT | DELIVERED | Driver |
| IN_TRANSIT | OFF_ROUTE | Driver / System |
| OFF_ROUTE | IN_TRANSIT | Driver |
| DELIVERED | CONSUMED | Manufacturer |
| Any state | SEIZED | Regulator |

### 9.3 Test State Transitions via UI

1. **Manufacturer:** Create shipment → Status = **CREATED**
2. **Manufacturer:** Click **Dispatch** → Status = **DISPATCHED**
3. **Driver:** Scan checkpoint for that shipment → Status auto-changes to **IN_TRANSIT**

### 9.4 Test State Transition via API

```powershell
# Step 1: Login as manufacturer
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"manufacturer","password":"manu123"}'
$token = $login.token

# Step 2: Get a CREATED shipment
$shipments = Invoke-RestMethod -Uri "http://localhost:3000/shipments"
$createdShipment = $shipments.shipments | Where-Object { $_.status -eq "CREATED" } | Select-Object -First 1
Write-Host "Shipment: $($createdShipment.id) - Status: $($createdShipment.status)"

# Step 3: Dispatch it
Invoke-RestMethod -Uri "http://localhost:3000/shipments/$($createdShipment.id)/transition" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"newState":"DISPATCHED"}'
```

✅ **Expected:** `"message": "State transition successful"`, `"previousState": "CREATED"`, `"currentState": "DISPATCHED"`

### 9.5 Test INVALID Transition (Should Fail)

Try to skip states (CREATED → DELIVERED directly):

```powershell
# This should FAIL
Invoke-RestMethod -Uri "http://localhost:3000/shipments/$($createdShipment.id)/transition" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"newState":"DELIVERED"}'
```

✅ **Expected:** Error: `"Invalid transition: CREATED → DELIVERED"`

---

## 10. PDF Compliance Reports

### 10.1 Download Shipment Report via API

```powershell
# Login as regulator
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"regulator","password":"reg123"}'
$token = $login.token

# Get a shipment ID
$shipments = Invoke-RestMethod -Uri "http://localhost:3000/shipments"
$shipmentId = $shipments.shipments[0].id

# Download PDF
Invoke-WebRequest -Uri "http://localhost:3000/api/reports/shipment/$shipmentId" -Headers @{Authorization="Bearer $token"} -OutFile "shipment_report.pdf"
Write-Host "PDF saved as shipment_report.pdf"
```

✅ **Expected:** PDF file saved in current directory. Open it to verify contents.

**PDF contains:**
- Chemical Identity (URN, Batch, Manufacturer)
- Shipment Details (route, weight, status)
- Event Chain (all transitions and checkpoints)
- Signature verification results

### 10.2 Download Daily Summary Report via API

```powershell
$today = Get-Date -Format "yyyy-MM-dd"
Invoke-WebRequest -Uri "http://localhost:3000/api/reports/daily/$today" -Headers @{Authorization="Bearer $token"} -OutFile "daily_report.pdf"
Write-Host "PDF saved as daily_report.pdf"
```

✅ **Expected:** PDF with daily summary of all shipments.

### 10.3 Download Reports via UI

1. Login as **Regulator**
2. Go to Dashboard → "All Shipments" section
3. Click ⬇️ icon next to a shipment → Downloads individual PDF
4. Click orange **"Daily Summary"** button → Downloads daily summary PDF

---

## 11. End-to-End Full Flow Test

> This is the **recommended testing sequence** that exercises every feature:

### Phase 1: Setup (5 minutes)

| Step | Action | Terminal |
|------|--------|---------|
| 1 | Start Node.js backend: `node server.js` | Terminal 1 |
| 2 | Start Frontend: `npx expo start --web` | Terminal 2 |
| 3 | Start ML backend: `python app.py` | Terminal 3 |
| 4 | Verify all 3 are running (no errors) | Check each |

### Phase 2: Manufacturer Flow (3 minutes)

| Step | Action | Expected Result |
|------|--------|----------------|
| 5 | Login as **Manufacturer** (blue button) | Manufacturer dashboard loads |
| 6 | Click **"+"** → Fill form → Create Shipment | Success message, new shipment appears |
| 7 | Note the Product ID of your new shipment | e.g., `TEST-CHEM-001` |
| 8 | Click **Dispatch** on the new shipment | Status changes to DISPATCHED |
| 9 | Click **QR** on the shipment | QR code modal with URN/Batch info |
| 10 | Click **Logout** | Return to login screen |

### Phase 3: Driver Flow (5 minutes)

| Step | Action | Expected Result |
|------|--------|----------------|
| 11 | Login as **Driver** (green button) | Driver dashboard loads |
| 12 | Click **Scan QR at Checkpoint** | QR Scanner opens |
| 13 | Type your Product ID → Click Lookup | Shipment details appear |
| 14 | Click **Confirm & Record Checkpoint** | Success! State → IN_TRANSIT |
| 15 | Go back → Click **View GPS** on shipment | GPS coordinates updating live |
| 16 | Watch GPS update for 15-20 seconds | Coordinates change every 5 seconds |
| 17 | Navigate to **Tamper** page | Tamper Flag System loads |
| 18 | Click **Raise Tamper Flag** | Alert sent to regulators |
| 19 | Click **Clear Flag** | Tamper flag cleared |
| 20 | Click **Logout** | Return to login screen |

### Phase 4: Regulator Flow (5 minutes)

| Step | Action | Expected Result |
|------|--------|----------------|
| 21 | Login as **Regulator** (orange button) | Regulator dashboard loads |
| 22 | Check **Stats** at top | Shows shipment counts |
| 23 | Check **Chain Integrity** panel | Shows signature rate & integrity |
| 24 | Scroll to **Alerts** section | Tamper alert from Step 18 visible |
| 25 | Navigate to **Audit Trail** | Full activity log visible |
| 26 | Filter audit by "STATE_TRANSITION" | Shows dispatch and checkpoint events |
| 27 | Click ⬇️ on a shipment → Download PDF | PDF report downloads |
| 28 | Click **Daily Summary** | Daily summary PDF downloads |
| 29 | Open both PDFs and verify content | Chemical identity, events, signatures |

### Phase 5: ML/IoT Pipeline (10 minutes)

| Step | Action | Expected Result |
|------|--------|----------------|
| 30 | Open Terminal 4 | New PowerShell window |
| 31 | Run ThingSpeak test: `python simulate_thingspeak.py --test` | ✅ SUCCESS message |
| 32 | Send manual sensor data (see Section 7.2) | ML returns risk assessment |
| 33 | Send anomaly data (see Section 7.3) | HIGH risk alerts generated |
| 34 | Run full pipeline: `python simulate_and_poll.py` | Wait ~10 minutes for completion |
| 35 | Refresh Regulator dashboard | New ML alerts appear |

### Phase 6: Blockchain Verification (3 minutes)

| Step | Action | Expected Result |
|------|--------|----------------|
| 36 | Check blockchain status (see Section 8.1) | Chain stats returned |
| 37 | Validate blockchain chain (see Section 8.1) | `valid: True` |
| 38 | View event chain for your shipment (Section 8.3) | Full event chain with signatures |
| 39 | Verify individual event signature (Section 8.4) | `verified: True` |

---

## 12. Troubleshooting

### Common Issues & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| Frontend won't start | Cache issue | Run `npx expo start --web --clear` |
| Backend crashes on start | Port 3000 in use | Run `netstat -ano \| findstr :3000`, then kill the process |
| ML backend won't start | Missing dependencies | Run `pip install -r requirements.txt` |
| Login fails | Backend not running | Make sure Terminal 1 shows backend is running |
| "Failed to transition" error | Missing DB column | Restart backend (it auto-migrates) |
| Checkpoint says "CREATED" | Shipment not dispatched | Login as Manufacturer → Click Dispatch first |
| QR code not loading | Missing package | Run `npm install react-qr-code` in frontend folder |
| ThingSpeak write fails | Rate limit | Wait 15 seconds between writes (free tier limit) |
| PDF download fails | Wrong role | Must be logged in as **regulator** |
| No alerts on dashboard | ML pipeline not run | Run `python simulate_and_poll.py` first |
| GPS not updating | No active shipment | Create and dispatch a shipment, then record a checkpoint |
| "Module not found" in ML | Wrong directory | Make sure you `cd` to `ML\backend` before running Python |
| TensorFlow warnings | Normal | These are just warnings, not errors. Everything still works. |

### Quick Health Checks

```powershell
# Backend health
Invoke-RestMethod -Uri "http://localhost:3000/health"

# ML Backend health
Invoke-RestMethod -Uri "http://localhost:5000/health"

# ThingSpeak connectivity
cd C:\Users\Lenovo\Desktop\Precursor_Main\ML\backend
python simulate_thingspeak.py --test
```

### Reset Everything (Fresh Start)

If you want to start completely fresh:

```powershell
# Stop all 3 servers (Ctrl+C in each terminal)

# Delete the database
cd C:\Users\Lenovo\Desktop\Precursor_Main\precursor-backend
Remove-Item precursor.db

# Restart backend (re-creates database with default users)
node server.js
```

### Port Conflicts

If a port is already in use:

```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace XXXX with the PID from above)
taskkill /PID XXXX /F
```

---

> **💡 Quick Reference: Test Account Credentials**
>
> | Role | Username | Password |
> |------|----------|----------|
> | Manufacturer | `manufacturer` | `manu123` |
> | Driver | `driver` | `driver123` |
> | Regulator | `regulator` | `reg123` |

---

> **📞 Need Help?** If any step doesn't work as described, check the terminal where the backend is running for error messages. Most issues are resolved by restarting the backend server.
