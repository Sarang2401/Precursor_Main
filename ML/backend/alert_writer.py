import json
import time
import uuid
import requests
from config import ALERT_FILE

# Node.js backend URL
NODE_BACKEND_URL = "http://localhost:3000"

def write_alert(device_id, sensor_data, ml_result):
    if not ml_result["alerts"]:
        return False

    alert_record = {
        "alert_id": f"ALT-{uuid.uuid4().hex[:8]}",
        "device": device_id,
        "timestamp": time.time(),
        "temp": sensor_data.get("temp"),
        "hum": sensor_data.get("hum"),
        "weight": sensor_data.get("weight"),
        "lat": sensor_data.get("lat"),
        "lon": sensor_data.get("lon"),
        "alerts": ml_result["alerts"],
        "categories": ml_result["categories"],
        "risk": ml_result["risk"],
        "status": "UNCONFIRMED"
    }

    # Write to local file (original behavior)
    with open(ALERT_FILE, "a") as f:
        f.write(json.dumps(alert_record) + "\n")

    # Push to Node.js backend for persistence
    try:
        response = requests.post(
            f"{NODE_BACKEND_URL}/api/ml-alerts",
            json=alert_record,
            timeout=2
        )
        if response.status_code in [200, 201]:
            print(f"✅ Alert pushed to Node.js backend: {alert_record['alert_id']}")
        else:
            print(f"⚠️ Failed to push alert to Node.js: {response.text}")
    except Exception as e:
        print(f"⚠️ Could not push alert to Node.js backend (may be offline): {e}")
        # Don't fail if Node backend is unreachable - local file is still written

    return True
