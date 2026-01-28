"""
Test Script for Precursor ML Features (Windows-Compatible)
=========================================================
Instructions:
1. Make sure the ML backend is running: cd ML/backend && python app.py
2. Make sure the Node backend is running: cd precursor-backend && npm start
3. Run this script: python test_features.py

This script tests:
- Task 2: Sensor-Shipment Linking
- Task 3: GPS Route Deviation Detection
- Task 4: Blockchain Verification
"""

import requests
import json
import time

# Configuration
ML_BACKEND = "http://localhost:5000"
NODE_BACKEND = "http://localhost:3000"

def print_header(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_result(label, data, indent=0):
    prefix = "  " * indent
    if isinstance(data, dict):
        print(f"{prefix}{label}:")
        for k, v in data.items():
            print(f"{prefix}  {k}: {v}")
    else:
        print(f"{prefix}{label}: {data}")

# ============================================================================
# TASK 2: Test Sensor-Shipment Linking
# ============================================================================
def test_sensor_shipment_linking():
    print_header("TASK 2: Sensor-Shipment Linking")
    
    # Create a new shipment
    print("\n1. Creating a new shipment...")
    try:
        response = requests.post(f"{NODE_BACKEND}/shipments", json={
            "productId": "TEST-MED-" + str(int(time.time())),
            "origin": "Mumbai",
            "destination": "Pune",
            "initialWeight": 50.5
        })
        
        if response.status_code == 201:
            data = response.json()
            shipment = data.get("shipment", {})
            print_result("✅ Shipment Created", {
                "ID": shipment.get("id", "N/A"),
                "Product": shipment.get("productId", "N/A"),
                "Sensor Device ID": shipment.get("sensorDeviceId", "❌ MISSING - Bug!"),
                "Status": shipment.get("status", "N/A")
            })
            
            # Check if sensorDeviceId was created
            if shipment.get("sensorDeviceId"):
                print("\n   ✅ Sensor Device ID auto-generated successfully!")
                
                # Get sensor info for this shipment
                print("\n2. Testing GET /shipments/:id/sensors endpoint...")
                sensor_response = requests.get(f"{NODE_BACKEND}/shipments/{shipment['id']}/sensors")
                if sensor_response.status_code == 200:
                    sensor_data = sensor_response.json()
                    print_result("✅ Sensor Endpoint Works", sensor_data)
                else:
                    print(f"   ❌ Sensor endpoint failed: {sensor_response.text}")
            else:
                print("\n   ❌ sensorDeviceId NOT found in shipment!")
        else:
            print(f"   ❌ Failed to create shipment: {response.text}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to Node backend. Is it running on port 3000?")

# ============================================================================
# TASK 3: Test GPS Route Deviation Detection
# ============================================================================
def test_gps_route_deviation():
    print_header("TASK 3: GPS Route Deviation Detection")
    
    print("\n1. Testing ON-ROUTE coordinates (Pune area)...")
    try:
        # On-route coordinates (Pune - should be LOW risk)
        response = requests.post(f"{ML_BACKEND}/api/sensor/manual", json={
            "device_id": "GPS_TEST_DEVICE",
            "temp": 25,
            "hum": 50,
            "weight": 95,
            "lat": 18.5204,  # Pune coordinates
            "lon": 73.8567,
            "skip_blockchain": True
        })
        
        if response.status_code == 200:
            result = response.json().get("result", {})
            alerts = result.get("alerts", [])
            has_route_deviation = any(a.get("type") == "route_deviation" for a in alerts)
            
            print_result("   Response", {
                "Risk Level": result.get("risk", "N/A"),
                "Alerts Count": len(alerts),
                "Route Deviation": "YES ❌ (unexpected)" if has_route_deviation else "NO ✅ (expected)"
            })
        else:
            print(f"   ❌ Request failed: {response.text}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to ML backend. Is it running on port 5000?")
        return
    
    print("\n2. Testing OFF-ROUTE coordinates (Mumbai)...")
    try:
        # Off-route coordinates (Mumbai - should trigger route_deviation alert)
        response = requests.post(f"{ML_BACKEND}/api/sensor/manual", json={
            "device_id": "GPS_TEST_DEVICE",
            "temp": 25,
            "hum": 50,
            "weight": 95,
            "lat": 19.0760,  # Mumbai coordinates - far from Pune route
            "lon": 72.8777,
            "skip_blockchain": True
        })
        
        if response.status_code == 200:
            result = response.json().get("result", {})
            alerts = result.get("alerts", [])
            route_alert = next((a for a in alerts if a.get("type") == "route_deviation"), None)
            
            if route_alert:
                print_result("   ✅ Route Deviation DETECTED!", {
                    "Type": route_alert.get("type"),
                    "Detail": route_alert.get("detail"),
                    "Distance from route": f"{route_alert.get('value', 0):.2f} km",
                    "GPS": f"({route_alert.get('lat')}, {route_alert.get('lon')})"
                })
            else:
                print("   ❌ Route deviation NOT detected (unexpected)")
                print_result("   Alerts received", alerts)
        else:
            print(f"   ❌ Request failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

# ============================================================================
# TASK 4: Test Blockchain Verification
# ============================================================================
def test_blockchain():
    print_header("TASK 4: Blockchain Verification")
    
    print("\n1. Validating blockchain integrity...")
    try:
        response = requests.get(f"{ML_BACKEND}/api/blockchain/validate")
        
        if response.status_code == 200:
            data = response.json()
            print_result("   ✅ Blockchain Validation", {
                "Valid": data.get("valid", False),
                "Message": data.get("message", "N/A"),
                "Block Count": data.get("block_count", 0)
            })
        else:
            print(f"   ❌ Validation failed: {response.text}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to ML backend. Is it running on port 5000?")
        return
    
    print("\n2. Getting blockchain statistics...")
    try:
        response = requests.get(f"{ML_BACKEND}/api/blockchain/stats")
        
        if response.status_code == 200:
            data = response.json()
            print_result("   ✅ Blockchain Stats", {
                "Total Blocks": data.get("total_blocks", 0),
                "Latest Block Time": data.get("latest_timestamp", "N/A")
            })
        else:
            print(f"   ❌ Stats failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n3. Getting latest block...")
    try:
        response = requests.get(f"{ML_BACKEND}/api/blockchain/latest")
        
        if response.status_code == 200:
            block = response.json().get("block", {})
            print_result("   ✅ Latest Block", {
                "Index": block.get("index", "N/A"),
                "Type": block.get("data", {}).get("type", "N/A"),
                "Hash (first 16 chars)": block.get("hash", "N/A")[:16] + "..."
            })
        else:
            print(f"   ❌ Latest block failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

# ============================================================================
# BLOCKCHAIN DATA SOURCE EXPLANATION
# ============================================================================
def explain_blockchain_data():
    print_header("BLOCKCHAIN DATA SOURCE")
    print("""
    📋 Answer to your question: "Is blockchain working on simulated values or ThingSpeak?"

    The blockchain receives data from BOTH sources:
    
    1. SIMULATED VALUES (via /api/sensor/manual endpoint):
       - When you run simulate_alerts.py or test scripts
       - Sends data directly to ML backend
       - ML processes it and records to blockchain
    
    2. THINGSPEAK VALUES (via /api/sensor/thingspeak endpoint):
       - When you call the ThingSpeak endpoint
       - Fetches latest data from your ThingSpeak channel
       - ML processes it and records to blockchain
    
    Currently your blockchain has records from simulated values.
    To use ThingSpeak:
    - Write sensor data to your ThingSpeak channel (fields 1-6)
    - Call: GET http://localhost:5000/api/sensor/thingspeak
    - Or set up auto_poll_thingspeak.py to poll continuously
    """)

# ============================================================================
# Main
# ============================================================================
if __name__ == "__main__":
    print("\n" + "="*60)
    print("  PRECURSOR FEATURE TEST SCRIPT (Windows Compatible)")
    print("="*60)
    print("\nMake sure both servers are running:")
    print("  - Node backend: cd precursor-backend && npm start")
    print("  - ML backend: cd ML/backend && python app.py")
    print("\nPress Enter to start tests...")
    input()
    
    test_sensor_shipment_linking()
    test_gps_route_deviation()
    test_blockchain()
    explain_blockchain_data()
    
    print("\n" + "="*60)
    print("  ALL TESTS COMPLETED!")
    print("="*60 + "\n")
