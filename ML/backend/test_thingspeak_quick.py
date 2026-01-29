"""
Quick ThingSpeak Test Script
=============================
Simulates ThingSpeak readings by calling the ML API directly multiple times.
This bypasses the 16-second ThingSpeak rate limit for faster testing.
"""

import requests
import time

ML_API_URL = "http://localhost:5000"

def test_thingspeak_pipeline():
    """Test the ThingSpeak to ML pipeline by calling the API multiple times."""
    
    print("\n" + "=" * 60)
    print("🧪 QUICK THINGSPEAK PIPELINE TEST")
    print("=" * 60)
    print("This calls /api/sensor/thingspeak repeatedly to warm up")
    print("the ML buffer and trigger alerts.\n")
    
    # Step 1: Warm up with 30 normal readings
    print("📊 Phase 1: Warming up ML buffer (30 readings)...")
    print("-" * 60)
    
    for i in range(30):
        try:
            response = requests.get(f"{ML_API_URL}/api/sensor/thingspeak", timeout=10)
            result = response.json()
            
            status = result.get("result", {}).get("info", "ok")
            risk = result.get("result", {}).get("risk", "?")
            
            print(f"   [{i+1}/30] Status: {status}, Risk: {risk}")
            time.sleep(0.5)  # Small delay to avoid overwhelming the server
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            break
    
    print("\n✅ Warm-up complete!")
    
    # Step 2: Check alerts
    print("\n📊 Phase 2: Checking alerts...")
    print("-" * 60)
    
    try:
        response = requests.get(f"{ML_API_URL}/api/regulator/alerts", timeout=10)
        alerts = response.json()
        
        if alerts:
            print(f"   ✅ Found {len(alerts)} alerts!")
            for i, alert in enumerate(alerts[:5], 1):  # Show first 5
                device = alert.get("device", "unknown")
                risk = alert.get("risk", "?")
                alert_types = ", ".join([a.get("detail", "") for a in alert.get("alerts", [])])
                print(f"   {i}. Device: {device}, Risk: {risk}, Types: {alert_types}")
        else:
            print("   ⚪ No alerts found")
            
    except Exception as e:
        print(f"   ❌ Error fetching alerts: {e}")
    
    print("\n" + "=" * 60)
    print("✅ TEST COMPLETE")
    print("=" * 60)
    print("\n💡 Tip: The ThingSpeak data you sent earlier should")
    print("   now trigger alerts if read through this pipeline.")
    print("\n   Check the alert file:")
    print("   cat C:\\ml_venv\\backend\\alerts\\alerts_logs.jsonl")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    test_thingspeak_pipeline()
