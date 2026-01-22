import json
import time
import uuid
from config import ALERT_FILE

def write_alert(device_id, sensor_data, ml_result):
    if not ml_result["alerts"]:
        return False

    alert_record = {
        "alert_id": f"ALT-{uuid.uuid4().hex[:8]}",
        "device": device_id,
        "timestamp": time.time(),
        "temp": sensor_data["temp"],
        "hum": sensor_data["hum"],
        "weight": sensor_data["weight"],
        "alerts": ml_result["alerts"],
        "categories": ml_result["categories"],
        "risk": ml_result["risk"],
        "status": "UNCONFIRMED"
    }

    with open(ALERT_FILE, "a") as f:
        f.write(json.dumps(alert_record) + "\n")

    # 🔗 FUTURE BLOCKCHAIN HOOK
    # push_hash_to_blockchain(hash(alert_record))

    return True
