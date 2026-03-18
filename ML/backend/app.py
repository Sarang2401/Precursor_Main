from flask import Flask, request, jsonify
from flask_cors import CORS
from ml.inference import reset_buffer, run_ml
from alert_writer import write_alert
from thingspeak_client import fetch_thingspeak
from config import ALERT_FILE
from blockchain import blockchain
from blockchain_api import blockchain_bp
import json, os
import threading
import time
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

app = Flask(__name__)

# CORS configuration - Allow all origins for mobile APK and deployed frontend
CORS(app, origins='*', supports_credentials=False)

# Register blockchain API Blueprint
app.register_blueprint(blockchain_bp)

# Background poller configuration
THINGSPEAK_POLL_INTERVAL = int(os.getenv('THINGSPEAK_POLL_INTERVAL', 60))  # seconds
NODE_BACKEND_URL = os.getenv('NODE_BACKEND_URL', 'http://localhost:3000')
ENABLE_AUTO_POLLING = os.getenv('ENABLE_AUTO_POLLING', 'true').lower() == 'true'

def record_to_blockchain(device_id: str, sensor_data: dict, ml_result: dict):
    """Record sensor event to blockchain for immutable audit trail."""
    try:
        blockchain.add_block({
            "type": "sensor_reading",
            "device_id": device_id,
            "sensor_data": sensor_data,
            "ml_result": ml_result
        })
    except Exception as e:
        print(f"⚠️ Blockchain recording failed: {e}")

def forward_alert_to_backend(device_id: str, sensor_data: dict, ml_result: dict):
    """Forward ML alerts to Node.js backend for persistence."""
    try:
        # Prepare alert payload
        alert_payload = {
            "alert_id": f"ML_{device_id}_{int(time.time())}",
            "device": device_id,   # send plain string - server now accepts both string and object
            "timestamp": time.time(),  # use unix timestamp (float) - server handles conversion
            "temp": sensor_data.get("temp"),
            "hum": sensor_data.get("hum"),
            "weight": sensor_data.get("weight"),
            "lat": sensor_data.get("lat"),
            "lon": sensor_data.get("lon"),
            "alerts": ml_result.get("alerts", []),
            "categories": ml_result.get("categories", []),
            "risk": ml_result.get("risk", "LOW"),
            "status": "UNCONFIRMED"
        }
        
        # Send to Node.js backend
        response = requests.post(
            f"{NODE_BACKEND_URL}/api/ml-alerts",
            json=alert_payload,
            timeout=5
        )
        
        if response.ok:
            print(f"✅ Alert forwarded to backend: {device_id}, risk={ml_result.get('risk')}")
        else:
            print(f"⚠️ Failed to forward alert: HTTP {response.status_code}")
    except Exception as e:
        print(f"⚠️ Alert forwarding failed: {e}")

def thingspeak_background_poller():
    """Background thread that polls ThingSpeak every 60 seconds."""
    print(f"🔄 ThingSpeak Auto-Poller Started (interval: {THINGSPEAK_POLL_INTERVAL}s)")
    
    poll_count = 0
    
    while True:
        try:
            time.sleep(THINGSPEAK_POLL_INTERVAL)
            poll_count += 1
            
            # Fetch and process ThingSpeak data
            device_id = "thingspeak_device"
            data = fetch_thingspeak()
            
            if data:
                # Extract GPS if available
                lat = data.pop("lat", None)
                lon = data.pop("lon", None)
                
                # Run ML inference
                ml_result = run_ml(device_id, data["temp"], data["hum"], data["weight"], lat=lat, lon=lon)
                
                # Write to local alert file
                write_alert(device_id, data, ml_result)
                
                # Forward to Node.js backend
                forward_alert_to_backend(device_id, {**data, "lat": lat, "lon": lon}, ml_result)
                
                # Record to blockchain
                record_to_blockchain(device_id, data, ml_result)
                
                risk = ml_result.get("risk", "?")
                alerts = ml_result.get("alerts", [])
                
                print(f"📡 Poll #{poll_count}: temp={data['temp']}°C, hum={data['hum']}%, weight={data['weight']}kg, risk={risk}, alerts={len(alerts)}")
            else:
                print(f"⚠️ Poll #{poll_count}: ThingSpeak data unavailable")
                
        except Exception as e:
            print(f"❌ Poller error: {e}")

@app.route("/api/sensor/manual", methods=["POST"])
def manual_sensor():
    payload = request.json
    device_id = payload.get("device_id", "manual_device")
    skip_blockchain = payload.get("skip_blockchain", False)
    data = {
        "temp": payload["temp"],
        "hum": payload["hum"],
        "weight": payload["weight"]
    }
    
    # Optional GPS coordinates
    lat = payload.get("lat")
    lon = payload.get("lon")

    ml = run_ml(device_id, data["temp"], data["hum"], data["weight"], lat=lat, lon=lon)
    write_alert(device_id, data, ml)
    
    # Forward to Node.js backend
    forward_alert_to_backend(device_id, {**data, "lat": lat, "lon": lon}, ml)
    
    # Record to blockchain (skip for simulations to avoid slow mining)
    if not skip_blockchain:
        record_to_blockchain(device_id, data, ml)

    return jsonify({"status": "ok", "result": ml})

@app.route("/api/sensor/thingspeak", methods=["GET"])
def thingspeak_sensor():
    device_id = "thingspeak_device" 

    data = fetch_thingspeak()
    if not data:
        return jsonify({"error": "ThingSpeak not configured"}), 500

    # Extract GPS if available
    lat = data.pop("lat", None)
    lon = data.pop("lon", None)

    ml = run_ml(device_id, data["temp"], data["hum"], data["weight"], lat=lat, lon=lon)
    write_alert(device_id, data, ml)
    
    # Forward to Node.js backend
    forward_alert_to_backend(device_id, {**data, "lat": lat, "lon": lon}, ml)
    
    # Record to blockchain
    record_to_blockchain(device_id, data, ml)

    return jsonify({"status": "ok", "result": ml})


@app.route("/api/regulator/alerts", methods=["GET"])
def get_alerts():
    alerts = []
    if os.path.exists(ALERT_FILE):
        with open(ALERT_FILE) as f:
            alerts = [json.loads(l) for l in f]
    return jsonify(alerts[::-1])

@app.route("/health")
def health():
    return jsonify({
        "status": "running",
        "auto_polling": ENABLE_AUTO_POLLING,
        "poll_interval": THINGSPEAK_POLL_INTERVAL
    })

# ============================================================================
# Start background poller at MODULE level (works with both gunicorn and python)
# gunicorn imports this file as a module, so __name__ == "app", not "__main__"
# ============================================================================
if ENABLE_AUTO_POLLING:
    poller_thread = threading.Thread(target=thingspeak_background_poller, daemon=True)
    poller_thread.start()
    print("✅ Background ThingSpeak poller thread started")
else:
    print("⚠️ Auto-polling disabled (set ENABLE_AUTO_POLLING=true to enable)")

if __name__ == "__main__":
    # Start Flask dev server (only when running directly: python app.py)
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, threaded=True)

