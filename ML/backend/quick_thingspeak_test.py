"""
Quick ThingSpeak Test (No Wait Required)
=========================================
This script directly tests the pipeline by:
1. Sending ONE anomaly reading to ThingSpeak
2. Immediately triggering the ML backend 30 times to fill the buffer
3. Then sending another anomaly to trigger an alert

This BYPASSES the warm-up wait time by filling the buffer with repeated reads.
"""

import time
import random
import requests

THINGSPEAK_WRITE_URL = "https://api.thingspeak.com/update"
WRITE_API_KEY = "VLOSULJR74NUYSKH"
ML_BACKEND_URL = "http://localhost:5000"

def send_anomaly_to_thingspeak():
    """Send anomaly data to ThingSpeak."""
    temp = round(random.uniform(40, 45), 2)
    weight = 0
    hum = round(random.uniform(75, 85), 2)
    
    response = requests.get(
        THINGSPEAK_WRITE_URL,
        params={"api_key": WRITE_API_KEY, "field1": temp, "field2": hum, "field3": weight},
        timeout=10
    )
    return temp, hum, weight, response.text

def trigger_ml_read():
    """Trigger ML backend to read from ThingSpeak."""
    response = requests.get(f"{ML_BACKEND_URL}/api/sensor/thingspeak", timeout=10)
    return response.json()

def main():
    print("\n" + "=" * 60)
    print("⚡ QUICK THINGSPEAK PIPELINE TEST")
    print("=" * 60)
    
    # Step 1: Send anomaly to ThingSpeak
    print("\n📡 Step 1: Sending anomaly to ThingSpeak...")
    temp, hum, weight, entry = send_anomaly_to_thingspeak()
    print(f"   Sent: temp={temp}°C, hum={hum}%, weight={weight}kg")
    print(f"   Entry: #{entry}")
    
    time.sleep(2)  # Give ThingSpeak time to update
    
    # Step 2: Fill buffer by calling ML backend 30 times
    print("\n🧠 Step 2: Filling ML buffer (30 reads)...")
    for i in range(30):
        result = trigger_ml_read()
        status = result.get("result", {}).get("info", "ok")
        risk = result.get("result", {}).get("risk", "?")
        alerts = result.get("result", {}).get("alerts", [])
        
        if status == "warming_up":
            print(f"   [{i+1}/30] warming up...", end="\r")
        else:
            alert_str = f", alerts: {len(alerts)}" if alerts else ""
            print(f"   [{i+1}/30] risk={risk}{alert_str}")
            
            if alerts:
                print(f"\n   🚨 ALERT TRIGGERED!")
                for alert in alerts:
                    print(f"      → {alert.get('type')}: {alert.get('detail')}")
        
        time.sleep(0.3)
    
    print()
    
    # Step 3: Check alerts
    print("\n📊 Step 3: Checking alerts...")
    response = requests.get(f"{ML_BACKEND_URL}/api/regulator/alerts", timeout=10)
    alerts = response.json()
    thingspeak_alerts = [a for a in alerts if a.get("device") == "thingspeak_device"]
    
    print(f"   Total alerts: {len(alerts)}")
    print(f"   ThingSpeak device alerts: {len(thingspeak_alerts)}")
    
    if thingspeak_alerts:
        print("\n   Latest thingspeak_device alerts:")
        for alert in thingspeak_alerts[:3]:
            risk = alert.get("risk", "?")
            alert_types = [a.get("detail", "") for a in alert.get("alerts", [])]
            print(f"   - Risk: {risk}, Types: {alert_types}")
    
    print("\n" + "=" * 60)
    print("✅ DONE! Check your app's ML Anomaly Alerts page.")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
