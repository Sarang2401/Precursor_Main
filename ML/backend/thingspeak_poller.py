"""
ThingSpeak Auto-Poller Background Service
==========================================
Automatically polls ThingSpeak every 60 seconds and triggers ML backend processing.

Run with: python thingspeak_poller.py

Keep this running in the background while your app is active.
"""

import time
import requests
from datetime import datetime
import signal
import sys

# Configuration
ML_BACKEND_URL = "http://localhost:5000"
POLL_INTERVAL = 10  # seconds (1 minute)
THINGSPEAK_CHECK_URL = "https://api.thingspeak.com/channels/3159663/feeds/last.json?api_key=51GLEXJAD1X1T2SZ"

# Global flag for graceful shutdown
running = True

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully."""
    global running
    print("\n\n🛑 Stopping ThingSpeak poller...")
    running = False

def poll_thingspeak():
    """Trigger ML backend to read and process ThingSpeak data."""
    try:
        response = requests.get(f"{ML_BACKEND_URL}/api/sensor/thingspeak", timeout=10)
        result = response.json()
        
        status = result.get("result", {}).get("info", "ok")
        risk = result.get("result", {}).get("risk", "?")
        alerts = result.get("result", {}).get("alerts", [])
        
        return {
            "success": True,
            "status": status,
            "risk": risk,
            "alerts": alerts
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def get_thingspeak_data():
    """Get current data from ThingSpeak to display in logs."""
    try:
        response = requests.get(THINGSPEAK_CHECK_URL, timeout=5)
        data = response.json()
        return {
            "temp": data.get("field1", "?"),
            "hum": data.get("field2", "?"),
            "weight": data.get("field3", "?")
        }
    except:
        return None

def main():
    """Main polling loop."""
    global running
    
    # Set up signal handler for Ctrl+C
    signal.signal(signal.SIGINT, signal_handler)
    
    print("\n" + "=" * 70)
    print("🔄 ThingSpeak Auto-Poller Service")
    print("=" * 70)
    print(f"Polling ThingSpeak every {POLL_INTERVAL} seconds")
    print("Press Ctrl+C to stop")
    print("=" * 70 + "\n")
    
    poll_count = 0
    alert_count = 0
    
    while running:
        poll_count += 1
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Get current ThingSpeak data (for display)
        ts_data = get_thingspeak_data()
        if ts_data:
            print(f"[{timestamp}] Poll #{poll_count}")
            print(f"   📡 ThingSpeak: temp={ts_data['temp']}°C, hum={ts_data['hum']}%, weight={ts_data['weight']}kg")
        else:
            print(f"[{timestamp}] Poll #{poll_count} - ThingSpeak data unavailable")
        
        # Trigger ML backend processing
        result = poll_thingspeak()
        
        if result["success"]:
            status = result["status"]
            risk = result["risk"]
            alerts = result["alerts"]
            
            if status == "warming_up":
                print(f"   🧠 ML Backend: warming up buffer...")
            elif alerts:
                alert_count += len(alerts)
                print(f"   🚨 ALERT! Risk: {risk}")
                for alert in alerts:
                    alert_type = alert.get("type", "unknown")
                    detail = alert.get("detail", "")
                    print(f"      → {alert_type}: {detail}")
            else:
                print(f"   ✅ ML Backend: risk={risk}, no alerts")
        else:
            print(f"   ❌ Error: {result['error']}")
        
        # Summary line
        print(f"   📊 Total alerts generated: {alert_count}")
        print()
        
        # Wait for next poll (check running flag every second for responsive shutdown)
        for _ in range(POLL_INTERVAL):
            if not running:
                break
            time.sleep(1)
    
    print("\n" + "=" * 70)
    print(f"✅ Poller stopped after {poll_count} polls")
    print(f"   Total alerts generated: {alert_count}")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
