import numpy as np
import joblib
from collections import deque
from tensorflow.keras.models import load_model
import csv
import os

# ---------------- LOAD MODELS ----------------
if_model = joblib.load("ml/isolation_forest.joblib")
lstm_model = load_model("ml/lstm_autoencoder.h5", compile=False)
lstm_scaler = joblib.load("ml/lstm_scaler.joblib")

# ---------------- CONFIG ----------------
WINDOW_SIZE = 30  # LSTM expects 30 timesteps
LSTM_THRESHOLD = 0.05
OFF_ROUTE_THRESHOLD_KM = 0.3  # 300 meters

# ---------------- LOAD EXPECTED ROUTE ----------------
expected_route = []
# Try multiple path strategies
possible_paths = [
    os.path.join(os.path.dirname(__file__), '..', 'data', 'expected_route.csv'),
    os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'expected_route.csv'),
    'ML/data/expected_route.csv',
    'data/expected_route.csv'
]

route_file = None
for path in possible_paths:
    if os.path.exists(path):
        route_file = path
        break

if route_file:
    try:
        with open(route_file, 'r') as f:
            reader = csv.DictReader(f)
            expected_route = [{'lat': float(row['lat']), 'lon': float(row['lon'])} for row in reader]
        print(f"✅ Loaded {len(expected_route)} route points from {route_file}")
        if expected_route:
            print(f"   First point: {expected_route[0]}, Last point: {expected_route[-1]}")
    except Exception as e:
        print(f"❌ Error loading route file: {e}")
else:
    print(f"❌ Route file not found. Searched: {possible_paths}")


# ---------------- BUFFER (per device) ----------------
buffers = {}

def reset_buffer(device_id):
    buffers[device_id] = {
        "temp": deque(maxlen=WINDOW_SIZE),
        "hum": deque(maxlen=WINDOW_SIZE),
        "weight": deque(maxlen=WINDOW_SIZE)
    }

def _get_buffer(device_id):
    if device_id not in buffers:
        buffers[device_id] = {
            "temp": deque(maxlen=WINDOW_SIZE),
            "hum": deque(maxlen=WINDOW_SIZE),
            "weight": deque(maxlen=WINDOW_SIZE)
        }
    return buffers[device_id]

def _extract_if_features(buf):
    temp = np.array(buf["temp"])
    hum = np.array(buf["hum"])

    return np.array([[
        temp.mean(), temp.std(), temp[-1] - temp[0],
        hum.mean(), hum.std(), hum[-1] - hum[0]
    ]])

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two GPS coordinates."""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c

def check_route_deviation(lat, lon):
    """Check if GPS coordinates deviate from expected route."""
    if not expected_route:
        print(f"⚠️ No expected route loaded - cannot check deviation")
        return False, None
    
    if lat is None or lon is None:
        print(f"⚠️ GPS coordinates are None: lat={lat}, lon={lon}")
        return False, None
    
    # Find minimum distance to any point on the route
    distances = [
        haversine_distance(lat, lon, point['lat'], point['lon'])
        for point in expected_route
    ]
    min_distance = min(distances)
    
    is_off_route = min_distance > OFF_ROUTE_THRESHOLD_KM
    print(f"📍 GPS check: ({lat}, {lon}) -> min_dist={min_distance:.2f}km, threshold={OFF_ROUTE_THRESHOLD_KM}km, off_route={is_off_route}")
    
    return is_off_route, min_distance

def run_ml(device_id, temp, hum, weight, lat=None, lon=None):
    buf = _get_buffer(device_id)

    buf["temp"].append(temp)
    buf["hum"].append(hum)
    buf["weight"].append(weight)

    # ============ GPS Route Deviation Check (immediate) ============
    # Check GPS FIRST - even during warmup, route violations must be detected!
    gps_alerts = []
    gps_categories = []
    
    if lat is not None and lon is not None:
        is_off_route, distance = check_route_deviation(lat, lon)
        if is_off_route:
            gps_alerts.append({
                "type": "route_deviation",
                "detail": "off_route",
                "value": distance,
                "lat": lat,
                "lon": lon
            })
            gps_categories.append("route_deviation")

    # ============ Rule-Based Checks (immediate, no buffer needed) ============
    rule_alerts = []
    rule_categories = []

    if temp > 33:
        rule_alerts.append({"type": "environment_anomaly", "detail": "temp_out_of_range", "value": temp})
        rule_categories.append("environment_anomaly")

    if weight <= 0:
        rule_alerts.append({"type": "sensor_failure", "detail": "load_cell_zero", "value": weight})
        rule_categories.append("sensor_failure")

    # If buffer not ready, return with GPS + rule-based alerts
    if len(buf["temp"]) < WINDOW_SIZE:
        all_alerts = gps_alerts + rule_alerts
        all_categories = list(set(gps_categories + rule_categories))
        return {
            "risk": "HIGH" if all_alerts else "LOW",
            "alerts": all_alerts,
            "categories": all_categories,
            "info": "warming_up"
        }


    # ---------------- Isolation Forest ----------------
    X_if = _extract_if_features(buf)
    if_score = float(if_model.decision_function(X_if)[0])
    if_anomaly = if_model.predict(X_if)[0] == -1

    # ---------------- LSTM ----------------
    temp_seq = np.array(buf["temp"], dtype=np.float32)
    hum_seq  = np.array(buf["hum"], dtype=np.float32)

    X_lstm = np.column_stack((temp_seq, hum_seq))
    X_scaled = lstm_scaler.transform(X_lstm)
    X_scaled = X_scaled.reshape(1, WINDOW_SIZE, 2)  # Add batch dimension: (1, 30, 2)

    
    recon = lstm_model.predict(X_scaled, verbose=0)
    lstm_error = float(np.mean(np.abs(recon - X_scaled)))

    # ---------------- Rule Checks ----------------
    alerts = []
    categories = []

    if temp > 33:
        alerts.append({"type": "environment_anomaly", "detail": "temp_out_of_range", "value": temp})
        categories.append("environment_anomaly")

    if weight <= 0:
        alerts.append({"type": "sensor_failure", "detail": "load_cell_zero", "value": weight})
        categories.append("sensor_failure")

    # Merge GPS alerts from early check
    alerts.extend(gps_alerts)
    categories.extend(gps_categories)

    # ---------------- Ensemble ----------------
    # Risk is HIGH if ML models detect anomaly OR any rule-based/GPS alerts fired
    risk = "HIGH" if if_anomaly or lstm_error > LSTM_THRESHOLD or alerts else "LOW"

    return {
        "if_score": if_score,
        "if_anomaly": bool(if_anomaly),  # Convert numpy.bool_ to Python bool
        "lstm_error": lstm_error,
        "risk": risk,
        "alerts": alerts,
        "categories": list(set(categories))
    }

