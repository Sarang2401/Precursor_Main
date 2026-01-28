"""
ThingSpeak Auto-Poller + Simulator
===================================
This script:
1. Sends simulated anomaly data to ThingSpeak
2. THEN automatically triggers the ML backend to read and process it
3. Repeats until the buffer warms up and alerts are generated

Run with: python simulate_and_poll.py
"""

import time
import random
import requests
from datetime import datetime

# ============================================================================
# Configuration
# ============================================================================

THINGSPEAK_WRITE_URL = "https://api.thingspeak.com/update"
WRITE_API_KEY = "VLOSULJR74NUYSKH"
CHANNEL_ID = "3159663"
ML_BACKEND_URL = "http://localhost:5000"

# ThingSpeak free tier requires 15 seconds between writes
WRITE_INTERVAL = 16

# ============================================================================
# Sensor Simulation Functions  
# ============================================================================

def generate_normal_reading():
    """Generate normal sensor readings."""
    return {
        "temp": round(random.uniform(20, 28), 2),
        "hum": round(random.uniform(45, 55), 2),
        "weight": round(random.uniform(90, 100), 2)
    }

def generate_anomaly_reading():
    """Generate anomaly reading (high temp + zero weight)."""
    return {
        "temp": round(random.uniform(38, 45), 2),  # HIGH - triggers alert!
        "hum": round(random.uniform(75, 90), 2),
        "weight": 0  # ZERO - triggers sensor_failure!
    }

# ============================================================================
# ThingSpeak + ML Backend Functions
# ============================================================================

def send_to_thingspeak(temp, hum, weight):
    """Send sensor data to ThingSpeak channel."""
    try:
        response = requests.get(
            THINGSPEAK_WRITE_URL,
            params={
                "api_key": WRITE_API_KEY,
                "field1": temp,
                "field2": hum,
                "field3": weight
            },
            timeout=10
        )
        if response.status_code == 200 and response.text != "0":
            return True, int(response.text)
        return False, response.text
    except Exception as e:
        return False, str(e)

def trigger_ml_backend():
    """Trigger ML backend to read from ThingSpeak and process."""
    try:
        response = requests.get(f"{ML_BACKEND_URL}/api/sensor/thingspeak", timeout=10)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def get_current_alerts():
    """Get current alerts from ML backend."""
    try:
        response = requests.get(f"{ML_BACKEND_URL}/api/regulator/alerts", timeout=10)
        return response.json()
    except Exception as e:
        return []

# ============================================================================
# Main Simulation
# ============================================================================

def run_complete_simulation():
    """Run complete simulation: send to ThingSpeak + trigger ML processing."""
    
    print("\n" + "=" * 70)
    print("🚀 COMPLETE THINGSPEAK → ML → DASHBOARD PIPELINE")
    print("=" * 70)
    print("This script will:")
    print("  1. Send sensor data to ThingSpeak")
    print("  2. AUTOMATICALLY trigger ML backend to read and process it")
    print("  3. Generate alerts visible on your dashboard")
    print("=" * 70)
    
    # Count initial alerts
    initial_alerts = get_current_alerts()
    initial_thingspeak_alerts = len([a for a in initial_alerts if a.get("device") == "thingspeak_device"])
    print(f"\n📊 Initial thingspeak_device alerts: {initial_thingspeak_alerts}")
    
    # Phase 1: Warm-up (30 readings with slight variations)
    print("\n" + "-" * 70)
    print("📊 PHASE 1: WARMING UP ML BUFFER (30 readings)")
    print("-" * 70)
    print("⏱️  This will take ~8 minutes due to ThingSpeak rate limits")
    print()
    
    for i in range(30):
        # Use normal readings with slight random variations for warm-up
        reading = generate_normal_reading()
        
        print(f"[{i+1}/30] Sending: temp={reading['temp']}°C, hum={reading['hum']}%, weight={reading['weight']}kg")
        
        # Step 1: Send to ThingSpeak
        success, entry = send_to_thingspeak(reading["temp"], reading["hum"], reading["weight"])
        if success:
            print(f"        ✅ ThingSpeak entry #{entry}")
        else:
            print(f"        ❌ ThingSpeak failed: {entry}")
            continue
        
        # Short delay to ensure ThingSpeak updates
        time.sleep(1)
        
        # Step 2: Trigger ML backend to read and process
        result = trigger_ml_backend()
        status = result.get("result", {}).get("info", "ok")
        risk = result.get("result", {}).get("risk", "?")
        print(f"        🧠 ML Backend: status={status}, risk={risk}")
        
        if i < 29:
            print(f"        ⏳ Waiting {WRITE_INTERVAL}s...")
            time.sleep(WRITE_INTERVAL - 1)  # -1 because we already waited 1s
    
    print("\n✅ Buffer warm-up complete!")
    
    # Phase 2: Send anomaly data
    print("\n" + "-" * 70)
    print("🚨 PHASE 2: SENDING ANOMALY DATA")
    print("-" * 70)
    
    for i in range(3):
        reading = generate_anomaly_reading()
        
        print(f"\n[{i+1}/3] ANOMALY: temp={reading['temp']}°C, hum={reading['hum']}%, weight={reading['weight']}kg")
        
        # Send to ThingSpeak
        success, entry = send_to_thingspeak(reading["temp"], reading["hum"], reading["weight"])
        if success:
            print(f"        ✅ ThingSpeak entry #{entry}")
        else:
            print(f"        ❌ ThingSpeak failed: {entry}")
            continue
        
        time.sleep(1)
        
        # Trigger ML backend
        result = trigger_ml_backend()
        risk = result.get("result", {}).get("risk", "?")
        alerts = result.get("result", {}).get("alerts", [])
        print(f"        🧠 ML Backend: risk={risk}")
        
        if alerts:
            print(f"        🚨 ALERT GENERATED!")
            for alert in alerts:
                print(f"           → {alert.get('type')}: {alert.get('detail')}")
        
        if i < 2:
            print(f"        ⏳ Waiting {WRITE_INTERVAL}s...")
            time.sleep(WRITE_INTERVAL - 1)
    
    # Check results
    print("\n" + "=" * 70)
    print("📊 RESULTS")
    print("=" * 70)
    
    final_alerts = get_current_alerts()
    final_thingspeak_alerts = len([a for a in final_alerts if a.get("device") == "thingspeak_device"])
    new_alerts = final_thingspeak_alerts - initial_thingspeak_alerts
    
    print(f"\n✅ New thingspeak_device alerts: {new_alerts}")
    print(f"   Total thingspeak_device alerts: {final_thingspeak_alerts}")
    
    if new_alerts > 0:
        print("\n🎉 SUCCESS! Alerts should now appear on your dashboard!")
        print("   Refresh the 'ML Anomaly Alerts' page in your app.")
    else:
        print("\n⚠️  No new alerts generated. This may be because:")
        print("   - All readings were within normal range for the ML models")
        print("   - The buffer may need more varied data over time")
    
    print(f"\n📱 Check alerts at: http://localhost:5000/api/regulator/alerts")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    run_complete_simulation()
