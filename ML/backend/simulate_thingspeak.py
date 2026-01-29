"""
ThingSpeak Sensor Simulator
============================
Simulates sensor readings and sends them to ThingSpeak channel.
This tests the real sensor pipeline: ThingSpeak → ML Backend → App Dashboard

Run with: python simulate_thingspeak.py

ThingSpeak Field Mapping:
  - field1 = Temperature (°C)
  - field2 = Humidity (%)
  - field3 = Weight (kg)
"""

import time
import random
import argparse
import requests
from datetime import datetime

# ============================================================================
# ThingSpeak Configuration (from Thinspeak.txt)
# ============================================================================

THINGSPEAK_WRITE_URL = "https://api.thingspeak.com/update"
WRITE_API_KEY = "VLOSULJR74NUYSKH"
CHANNEL_ID = "3159663"

# ThingSpeak free tier requires 15 seconds between writes
WRITE_INTERVAL = 16  # Using 16 seconds to be safe

# ============================================================================
# Sensor Simulation Functions
# ============================================================================

def generate_normal_reading():
    """Generate normal sensor readings (no alerts expected)."""
    return {
        "temp": round(random.uniform(20, 28), 2),      # Normal: 20-28°C
        "hum": round(random.uniform(45, 55), 2),       # Normal: 45-55%
        "weight": round(random.uniform(90, 100), 2)    # Normal: 90-100kg
    }

def generate_high_temp_anomaly():
    """Generate high temperature anomaly (triggers alert when temp > 33)."""
    return {
        "temp": round(random.uniform(35, 45), 2),      # HIGH - triggers alert!
        "hum": round(random.uniform(45, 55), 2),
        "weight": round(random.uniform(90, 100), 2)
    }

def generate_weight_anomaly():
    """Generate weight/sensor failure anomaly (triggers when weight <= 0)."""
    return {
        "temp": round(random.uniform(22, 28), 2),
        "hum": round(random.uniform(45, 55), 2),
        "weight": 0  # ZERO - triggers sensor_failure alert!
    }

def generate_combined_anomaly():
    """Generate multiple anomalies at once."""
    return {
        "temp": round(random.uniform(38, 42), 2),      # HIGH temp
        "hum": round(random.uniform(75, 90), 2),       # HIGH humidity
        "weight": 0  # ZERO weight
    }

# ============================================================================
# ThingSpeak API Functions
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
        
        # ThingSpeak returns the entry number on success, 0 on failure
        if response.status_code == 200 and response.text != "0":
            return True, int(response.text)
        else:
            return False, response.text
            
    except requests.exceptions.RequestException as e:
        return False, str(e)

def check_thingspeak_read():
    """Verify the latest data on ThingSpeak channel."""
    try:
        url = f"https://api.thingspeak.com/channels/{CHANNEL_ID}/feeds/last.json"
        response = requests.get(url, params={"api_key": "51GLEXJAD1X1T2SZ"}, timeout=5)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

# ============================================================================
# Main Simulation Functions
# ============================================================================

def run_warmup_simulation(count=30):
    """
    Send normal readings to warm up the ML buffer.
    The ML model needs 30 readings before it can make predictions.
    """
    print("\n" + "=" * 60)
    print("🔥 THINGSPEAK WARM-UP PHASE")
    print("=" * 60)
    print(f"Sending {count} normal readings to fill ML buffer")
    print(f"⏱️  Estimated time: {count * WRITE_INTERVAL // 60} minutes {(count * WRITE_INTERVAL) % 60} seconds")
    print("-" * 60)
    
    for i in range(count):
        reading = generate_normal_reading()
        
        print(f"\n[{i+1}/{count}] Sending: temp={reading['temp']}°C, "
              f"hum={reading['hum']}%, weight={reading['weight']}kg")
        
        success, result = send_to_thingspeak(reading["temp"], reading["hum"], reading["weight"])
        
        if success:
            print(f"   ✅ Sent successfully (entry #{result})")
        else:
            print(f"   ❌ Failed: {result}")
        
        if i < count - 1:
            print(f"   ⏳ Waiting {WRITE_INTERVAL}s for ThingSpeak rate limit...")
            time.sleep(WRITE_INTERVAL)
    
    print("\n" + "=" * 60)
    print("✅ WARM-UP COMPLETE")
    print("=" * 60)

def run_anomaly_simulation():
    """Send anomaly readings to trigger ML alerts."""
    print("\n" + "=" * 60)
    print("🚨 THINGSPEAK ANOMALY PHASE")
    print("=" * 60)
    print("Sending anomaly readings to trigger ML alerts")
    print("-" * 60)
    
    anomaly_scenarios = [
        ("🌡️  HIGH TEMP (>33°C)", generate_high_temp_anomaly),
        ("⚖️  WEIGHT ZERO", generate_weight_anomaly),
        ("⚠️  COMBINED (high temp + zero weight)", generate_combined_anomaly),
    ]
    
    for i, (label, generator) in enumerate(anomaly_scenarios):
        reading = generator()
        
        print(f"\n[{i+1}/{len(anomaly_scenarios)}] {label}")
        print(f"   Sending: temp={reading['temp']}°C, "
              f"hum={reading['hum']}%, weight={reading['weight']}kg")
        
        success, result = send_to_thingspeak(reading["temp"], reading["hum"], reading["weight"])
        
        if success:
            print(f"   ✅ Sent successfully (entry #{result})")
        else:
            print(f"   ❌ Failed: {result}")
        
        if i < len(anomaly_scenarios) - 1:
            print(f"   ⏳ Waiting {WRITE_INTERVAL}s for ThingSpeak rate limit...")
            time.sleep(WRITE_INTERVAL)
    
    print("\n" + "=" * 60)
    print("✅ ANOMALY PHASE COMPLETE")
    print("=" * 60)

def run_quick_test():
    """Send a single reading to verify ThingSpeak connectivity."""
    print("\n" + "=" * 60)
    print("🔌 THINGSPEAK QUICK TEST")
    print("=" * 60)
    
    reading = generate_normal_reading()
    print(f"Sending: temp={reading['temp']}°C, hum={reading['hum']}%, weight={reading['weight']}kg")
    
    success, result = send_to_thingspeak(reading["temp"], reading["hum"], reading["weight"])
    
    if success:
        print(f"✅ SUCCESS! Entry #{result} created")
        print("\nVerifying read from ThingSpeak...")
        data = check_thingspeak_read()
        print(f"Latest data on channel: {data}")
    else:
        print(f"❌ FAILED: {result}")
    
    print("=" * 60)

def run_full_simulation():
    """Run complete simulation: warm-up + anomalies."""
    print("\n" + "=" * 70)
    print("🎯 FULL THINGSPEAK SIMULATION")
    print("=" * 70)
    print("This will:")
    print("  1. Send 30 normal readings to warm up ML buffer (~8 minutes)")
    print("  2. Send 3 anomaly readings to trigger alerts (~48 seconds)")
    print("\nAfter completion, check alerts at:")
    print("  📱 App: /regulator/alerts")
    print("  🔌 API: http://localhost:5000/api/regulator/alerts")
    print("=" * 70)
    
    input("\nPress ENTER to start (or Ctrl+C to cancel)...")
    
    run_warmup_simulation(30)
    
    print("\n⏳ Short pause before anomaly phase...")
    time.sleep(WRITE_INTERVAL)
    
    run_anomaly_simulation()
    
    print("\n" + "=" * 70)
    print("🎉 FULL SIMULATION COMPLETE!")
    print("=" * 70)
    print("\nNow trigger the ML backend to read from ThingSpeak:")
    print("  curl http://localhost:5000/api/sensor/thingspeak")
    print("\nOr check alerts directly:")
    print("  curl http://localhost:5000/api/regulator/alerts")
    print("=" * 70)

# ============================================================================
# CLI Interface
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Simulate sensors sending data to ThingSpeak",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python simulate_thingspeak.py --test          Quick connectivity test
  python simulate_thingspeak.py --warmup 5      Send 5 warm-up readings
  python simulate_thingspeak.py --anomaly       Send anomaly readings
  python simulate_thingspeak.py --full          Full simulation (warmup + anomalies)
        """
    )
    
    parser.add_argument("--test", action="store_true", 
                        help="Quick test: send single reading")
    parser.add_argument("--warmup", type=int, metavar="N",
                        help="Send N normal readings to warm up ML buffer")
    parser.add_argument("--anomaly", action="store_true",
                        help="Send anomaly readings to trigger alerts")
    parser.add_argument("--full", action="store_true",
                        help="Full simulation: 30 warmup + anomalies")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 60)
    print("📡 PRECURSOR - ThingSpeak Sensor Simulator")
    print("=" * 60)
    print(f"Channel ID: {CHANNEL_ID}")
    print(f"Write Interval: {WRITE_INTERVAL}s (ThingSpeak rate limit)")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    if args.test:
        run_quick_test()
    elif args.warmup:
        run_warmup_simulation(args.warmup)
    elif args.anomaly:
        run_anomaly_simulation()
    elif args.full:
        run_full_simulation()
    else:
        # Default: show help
        parser.print_help()
        print("\n💡 Tip: Start with --test to verify ThingSpeak connectivity")

if __name__ == "__main__":
    main()
