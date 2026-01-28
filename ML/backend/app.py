from flask import Flask, request, jsonify
from flask_cors import CORS
from ml.inference import reset_buffer, run_ml
from alert_writer import write_alert
from thingspeak_client import fetch_thingspeak
from config import ALERT_FILE
from blockchain import blockchain
from blockchain_api import blockchain_bp
import json, os

app = Flask(__name__)
CORS(app)  # Enable CORS for Expo app

# Register blockchain API Blueprint
app.register_blueprint(blockchain_bp)

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
    return jsonify({"status": "running"})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, threaded=True)

