"""
Simulation Script - Generates test alerts for the Regulator Dashboard
======================================================================
This script simulates sensor readings that trigger ML anomaly detection
and generate alerts visible on the regulator dashboard.

Run with: python simulate_alerts.py
"""

import time
import random
import requests
from datetime import datetime

# Backend API URL
API_URL = "http://localhost:5000"

# Use consistent device ID so ML buffer fills properly
DEVICE_ID = "SIM_DEVICE_001"

def simulate_normal_reading(skip_blockchain=False):
    """Generate normal sensor readings (no alerts)."""
    return {
        "device_id": DEVICE_ID,
        "temp": random.uniform(20, 28),  # Normal range
        "hum": random.uniform(45, 55),   # Normal range
        "weight": random.uniform(90, 100), # Normal range
        "skip_blockchain": skip_blockchain
    }

def simulate_high_temp_anomaly():
    """Generate high temperature anomaly (triggers alert when temp > 33)."""
    return {
        "device_id": DEVICE_ID,
        "temp": random.uniform(35, 45),  # HIGH - triggers alert!
        "hum": random.uniform(45, 55),
        "weight": random.uniform(90, 100)
    }

def simulate_weight_anomaly():
    """Generate weight/sensor failure anomaly (triggers when weight <= 0)."""
    return {
        "device_id": DEVICE_ID,
        "temp": random.uniform(22, 28),
        "hum": random.uniform(45, 55),
        "weight": 0  # ZERO - triggers sensor_failure alert!
    }

def simulate_combined_anomaly():
    """Generate multiple anomalies at once."""
    return {
        "device_id": DEVICE_ID,
        "temp": random.uniform(38, 42),  # HIGH temp (>33 triggers alert)
        "hum": random.uniform(75, 90),   # HIGH humidity
        "weight": 0  # ZERO weight (triggers sensor_failure)
    }

def send_sensor_data(data):
    """Send sensor data to the ML backend API."""
    try:
        response = requests.post(
            f"{API_URL}/api/sensor/manual",
            json=data,
            timeout=10
        )
        return response.json()
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed! Is the Flask server running?")
        print(f"   Start it with: cd ML/backend && python app.py")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def run_simulation():
    """Run the alert simulation."""
    print("\n" + "=" * 60)
    print("🚨 PRECURSOR ALERT SIMULATION")
    print("=" * 60)
    print(f"Device ID: {DEVICE_ID}")
    print("This script generates sensor data to trigger ML alerts")
    print("for the Regulator Dashboard.\n")
    
    # Warm-up phase: Send 30 normal readings to fill the buffer
    print("📊 Phase 1: Warming up ML model buffer (30 readings)...")
    print("-" * 40)
    
    for i in range(30):
        data = simulate_normal_reading(skip_blockchain=True)  # Skip blockchain during warm-up
        result = send_sensor_data(data)
        if result is None:
            return
        
        status = result.get("result", {}).get("info", "ok")
        risk = result.get("result", {}).get("risk", "?")
        print(f"   [{i+1}/30] temp={data['temp']:.1f}°C, "
              f"weight={data['weight']:.1f}kg - {status} (risk: {risk})")
        time.sleep(0.1)
    
    print("\n✅ Buffer warmed up! Now generating anomalies...\n")
    
    # Alert generation phase
    print("📊 Phase 2: Generating ANOMALY readings (should trigger alerts)...")
    print("-" * 40)
    
    anomaly_scenarios = [
        ("🌡️  HIGH TEMP (>33°C)", simulate_high_temp_anomaly),
        ("⚖️  WEIGHT ZERO", simulate_weight_anomaly),
        ("⚠️  COMBINED (high temp + zero weight)", simulate_combined_anomaly),
        ("🌡️  HIGH TEMP (>33°C)", simulate_high_temp_anomaly),
        ("⚖️  WEIGHT ZERO", simulate_weight_anomaly),
    ]
    
    alerts_generated = 0
    
    for label, generator in anomaly_scenarios:
        data = generator()
        result = send_sensor_data(data)
        
        if result is None:
            continue
            
        ml_result = result.get("result", {})
        risk = ml_result.get("risk", "?")
        alerts = ml_result.get("alerts", [])
        
        print(f"\n   {label}")
        print(f"   Temp: {data['temp']:.1f}°C | Hum: {data['hum']:.1f}% | Weight: {data['weight']:.1f}kg")
        print(f"   ML Risk Level: {risk}")
        
        if alerts:
            alerts_generated += 1
            print(f"   ✅ ALERT TRIGGERED!")
            for alert in alerts:
                print(f"      → {alert['type']}: {alert['detail']} (value: {alert['value']})")
        else:
            print(f"   ⚪ No rule-based alert (temp/weight within thresholds)")
        
        time.sleep(0.3)
    
    # Summary
    print("\n" + "=" * 60)
    print(f"✅ SIMULATION COMPLETE")
    print("=" * 60)
    print(f"   Total rule-based alerts generated: {alerts_generated}")
    print(f"\n   📱 View alerts in the app:")
    print(f"      http://localhost:8082/(regulator)/alerts")
    print(f"\n   🔌 API endpoint:")
    print(f"      GET {API_URL}/api/regulator/alerts")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    run_simulation()

