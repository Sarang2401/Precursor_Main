# backend/app.py
"""
Stage-2+ ensemble backend:
- Loads LSTM autoencoder + scaler + IsolationForest
- Maintains buffers per device for sequence windows
- Performs inference (LSTM reconstruction error + IsolationForest)
- Combines via weighted ensemble and categorizes alerts
- Optionally polls ThingSpeak (READ API) to fetch latest sensor data
- REST endpoints:
    POST /report        -> accept IoT device POST (device push)
    GET  /alerts        -> get recent alerts (for regulator dashboard)
    GET  /check_thingspeak -> trigger immediate ThingSpeak fetch & processing
"""

import os
import time
import csv
import json
import traceback
import threading
from datetime import datetime

from flask import Flask, request, jsonify
import numpy as np
import joblib
from tensorflow.keras.models import load_model
from math import radians, sin, cos, sqrt, atan2
import requests

app = Flask(__name__)

# ----------------------------
# Configuration (tune these)
# ----------------------------
BASE_DIR = os.path.dirname(__file__)  # backend/
ML_DIR = os.path.join(BASE_DIR, "..", "ml")
DATA_DIR = os.path.join(BASE_DIR, "..", "data")

LSTM_MODEL_PATH = os.path.normpath(os.path.join(ML_DIR, "lstm_autoencoder.h5"))
LSTM_SCALER_PATH = os.path.normpath(os.path.join(ML_DIR, "lstm_scaler.joblib"))
IF_MODEL_PATH = os.path.normpath(os.path.join(ML_DIR, "isolation_forest.joblib"))

# expected route CSV
EXPECTED_ROUTE_CSV = os.path.normpath(os.path.join(DATA_DIR, "expected_route.csv"))

# ThingSpeak settings (if you will poll)
THINGSPEAK_CHANNEL_ID = "<YOUR_CHANNEL_ID>"   # <-- replace
THINGSPEAK_READ_KEY = "<YOUR_READ_API_KEY>"   # <-- replace
THINGSPEAK_READ_URL = f"https://api.thingspeak.com/channels/{THINGSPEAK_CHANNEL_ID}/feeds.json?api_key={THINGSPEAK_READ_KEY}&results=1"

# thresholds & windows (tune based on validation)
SEQ_LEN = 30               # LSTM sequence length (must match training)
IF_WINDOW = 10             # window size used for isolation features
DIST_TOL_M = 30.0          # allowed distance to waypoint
TEMP_MIN = 18.0
TEMP_MAX = 30.0

# ensemble weights
W_LSTM = 0.7
W_IF = 0.3

# detection thresholds (tune)
LSTM_ERROR_THRESHOLD = None   # if None compute on first run or set empirically
ENSEMBLE_HIGH = 0.8
ENSEMBLE_MED = 0.5

# internal buffers and state
DEVICE_BUFFERS = {}   # device_id -> deque/list of recent readings (dicts)
ALERTS = []           # sliding list of recent alerts to serve dashboard (store last N)
MAX_ALERTS = 200

# ----------------------------
# Utility functions
# ----------------------------
def haversine_meters(lat1, lon1, lat2, lon2):
    R = 6371000.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

def load_expected_route(csv_path=EXPECTED_ROUTE_CSV):
    route = []
    if os.path.exists(csv_path):
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for r in reader:
                try:
                    route.append((float(r['lat']), float(r['lon'])))
                except:
                    continue
    return route

EXPECTED_ROUTE = load_expected_route()

def nearest_expected_point(lat, lon):
    if not EXPECTED_ROUTE:
        return None, None
    best = None
    best_d = float('inf')
    idx = None
    for i, (elat, elon) in enumerate(EXPECTED_ROUTE):
        d = haversine_meters(lat, lon, elat, elon)
        if d < best_d:
            best_d = d; best = (elat, elon); idx = i
    return best, best_d

# ----------------------------
# Load ML models
# ----------------------------
print("Loading ML models...")
if not os.path.exists(LSTM_MODEL_PATH):
    raise FileNotFoundError(f"LSTM model not found at {LSTM_MODEL_PATH}")
model_lstm = load_model(LSTM_MODEL_PATH, compile=False)

if not os.path.exists(LSTM_SCALER_PATH):
    raise FileNotFoundError(f"LSTM scaler not found at {LSTM_SCALER_PATH}")
scaler = joblib.load(LSTM_SCALER_PATH)

if not os.path.exists(IF_MODEL_PATH):
    raise FileNotFoundError(f"IsolationForest model not found at {IF_MODEL_PATH}")
model_if = joblib.load(IF_MODEL_PATH)

print("Models loaded.")

# ----------------------------
# Feature extraction helpers
# ----------------------------
def extract_if_features(buffer):
    """Given buffer (list of dicts with 'temp' and 'hum'), extract the 6 features used in training."""
    temps = np.array([b['temp'] for b in buffer])
    hums  = np.array([b['hum'] for b in buffer])
    return np.array([
        np.mean(temps),
        np.std(temps) if len(temps)>1 else 0.0,
        temps[-1] - temps[0],
        np.mean(hums),
        np.std(hums) if len(hums)>1 else 0.0,
        hums[-1] - hums[0]
    ]).reshape(1, -1)

def normalize_for_lstm(seq_array):
    """seq_array shape: (timesteps, features). Use scaler saved during training."""
    # scaler was fit on columns [temp, hum] in training (MinMaxScaler)
    flat = scaler.transform(seq_array)  # scaler expects 2D (n_samples, n_features)
    return flat

# ----------------------------
# Inference + ensemble logic
# ----------------------------
def process_reading(device, ts, lat, lon, temp, hum, weight=None):
    """
    Main processing: buffer maintenance -> rule checks -> ml inference -> ensemble -> categorize -> log alert
    Returns: dict result with flags and ensemble score
    """
    # initialize buffer if needed
    buf = DEVICE_BUFFERS.setdefault(device, [])
    # append reading (keep at most SEQ_LEN)
    buf.append({"ts": ts, "temp": float(temp), "hum": float(hum), "lat": lat, "lon": lon, "weight": weight})
    if len(buf) > SEQ_LEN:
        buf.pop(0)
    DEVICE_BUFFERS[device] = buf

    alerts = []
    # Stage 0: Rule checks
    if temp is None or hum is None:
        alerts.append({"type":"sensor_failure", "detail":"missing_temp_or_hum"})
    else:
        if temp < TEMP_MIN or temp > TEMP_MAX:
            alerts.append({"type":"environment_anomaly", "detail":"temp_out_of_range", "value": temp})
        if hum < 10 or hum > 90:
            alerts.append({"type":"environment_anomaly", "detail":"hum_out_of_range", "value": hum})

    # Route check
    if lat is not None and lon is not None:
        nearest, dist = nearest_expected_point(lat, lon)
        if nearest is not None and dist > DIST_TOL_M:
            alerts.append({"type":"route_deviation", "detail":"distance_m", "value": dist})

    # Stage 1: IsolationForest (if enough IF_WINDOW samples available)
    if len(buf) >= IF_WINDOW:
        recent_if_buf = buf[-IF_WINDOW:]
        feat_if = extract_if_features(recent_if_buf)  # shape (1,6)
        try:
            pred_if = model_if.predict(feat_if)[0]   # 1 = normal, -1 = anomaly
            if_anomaly = (pred_if == -1)
            # optional numeric score (negative means more anomalous)
            if_score = float(model_if.decision_function(feat_if)[0])  
        except Exception as e:
            if_anomaly = False
            if_score = 0.0
    else:
        if_anomaly = False
        if_score = 0.0

    # Stage 2: LSTM Autoencoder (requires SEQ_LEN)
    lstm_error = 0.0
    lstm_flag = False
    if len(buf) == SEQ_LEN:
        seq = np.array([[b['temp'], b['hum']] for b in buf])  # shape (SEQ_LEN, 2)
        # IMPORTANT: scale using scaler (same used in training)
        try:
            seq_scaled = scaler.transform(seq)   # shape (SEQ_LEN,2)
        except Exception as e:
            # if scaler errors, fallback to raw
            seq_scaled = seq
        # model expects shape (1, timesteps, features)
        inp = seq_scaled.reshape((1, SEQ_LEN, seq_scaled.shape[1]))
        recon = model_lstm.predict(inp)
        # reconstruction error (MSE across sequence)
        lstm_error = float(np.mean(np.square(inp - recon)))
        # if a global threshold set
        if LSTM_ERROR_THRESHOLD is not None:
            lstm_flag = lstm_error > LSTM_ERROR_THRESHOLD
        else:
            # normalize error for ensemble mapping (we will normalize below)
            lstm_flag = False

    # Normalize/scale lstm_error to a 0..1 range for ensemble
    # We need to map observed errors to [0,1]. Use a practical scaling:
    #    lstm_norm = 1 - exp(-lstm_error / alpha) kind of mapping
    # Choose alpha = median observed error during normal operation (default 100.0)
    alpha = 100.0
    try:
        lstm_norm = 1.0 - np.exp(-lstm_error / alpha)
    except:
        lstm_norm = 0.0

    # IsolationForest normalization: map if_score or if_anomaly to 0..1
    # Use if_anomaly boolean (1 => anomaly), or map decision_function negative -> more abnormal
    if_norm = 1.0 if if_anomaly else 0.0

    # Ensemble score
    ensemble_score = float(W_LSTM * lstm_norm + W_IF * if_norm)

    # Final risk label
    if ensemble_score >= ENSEMBLE_HIGH:
        risk = "HIGH"
    elif ensemble_score >= ENSEMBLE_MED:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    # Final categorization heuristics
    categories = set()
    if any(a['type']=='sensor_failure' for a in alerts):
        categories.add("sensor_failure")
    if any(a['type']=='environment_anomaly' for a in alerts) or (lstm_norm > 0.6):
        categories.add("environment_anomaly")
    if any(a['type']=='route_deviation' for a in alerts):
        categories.add("route_deviation")
    if ensemble_score >= ENSEMBLE_HIGH:
        categories.add("suspicious_behavior")

    if not categories:
        categories.add("none")

    # Create alert object if ensemble indicates or rule triggers
    alert_obj = None
    if (risk in ("HIGH", "MEDIUM")) or alerts:
        alert_obj = {
            "device": device,
            "ts": ts,
            "lat": lat,
            "lon": lon,
            "temp": temp,
            "hum": hum,
            "weight": weight,
            "alerts": alerts,
            "if_anomaly": bool(if_anomaly),
            "if_score": if_score,
            "lstm_error": lstm_error,
            "lstm_norm": lstm_norm,
            "ensemble_score": ensemble_score,
            "risk": risk,
            "categories": list(categories)
        }
        # append to ALERTS (sliding)
        ALERTS.insert(0, alert_obj)
        if len(ALERTS) > MAX_ALERTS:
            ALERTS.pop()

    # return summary
    return {
        "alerts": alerts,
        "if_anomaly": bool(if_anomaly),
        "if_score": if_score,
        "lstm_error": lstm_error,
        "lstm_norm": lstm_norm,
        "ensemble_score": ensemble_score,
        "risk": risk,
        "categories": list(categories),
        "alert_logged": alert_obj is not None
    }

# ----------------------------
# REST endpoints
# ----------------------------

@app.route("/report", methods=["POST"])
def report():
    """
    Device POST (or ThingSpeak webhook -> forward here) JSON expected:
    {
        "device_id": "truck1",
        "timestamp": 169...,    # optional
        "lat": 19.12,
        "lon": 72.98,
        "temp": 24.5,
        "hum": 51.2,
        "weight": 12.3
    }
    """
    try:
        data = request.get_json(force=True)
        device = data.get("device_id", data.get("device", "unknown"))
        ts = data.get("timestamp", time.time())
        lat = data.get("lat")
        lon = data.get("lon")
        temp = data.get("temp") or data.get("temperature")
        hum = data.get("hum") or data.get("humidity")
        weight = data.get("weight")

        result = process_reading(device, ts, lat, lon, temp, hum, weight)
        return jsonify({"status":"ok", "result": result}), 200
    except Exception as e:
        print("Error in /report:", traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route("/alerts", methods=["GET"])
def get_alerts():
    """
    Returns recent alerts (dashboard / regulator polls this endpoint)
    """
    # optionally allow query param limit
    limit = int(request.args.get("limit", 50))
    return jsonify({"alerts": ALERTS[:limit]}), 200

@app.route("/check_thingspeak", methods=["GET"])
def check_thingspeak():
    """
    Manually trigger ThingSpeak fetch & processing (for testing)
    """
    try:
        data = fetch_latest_from_thingspeak()
        if data is None:
            return jsonify({"status":"no_data"}), 404
        device = data.get("device_id", "thingspeak_device")
        ts = data.get("timestamp", time.time())
        res = process_reading(device, ts, data.get("lat"), data.get("lon"), data.get("temperature"), data.get("humidity"), data.get("weight"))
        return jsonify({"status":"ok", "result": res}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------------
# ThingSpeak fetcher
# ----------------------------
def fetch_latest_from_thingspeak():
    """Return dict with temperature, humidity, weight, lat, lon (if available)"""
    if "<YOUR_CHANNEL_ID>" in THINGSPEAK_CHANNEL_ID:
        # not configured
        return None
    try:
        r = requests.get(THINGSPEAK_READ_URL, timeout=5)
        j = r.json()
        if "feeds" not in j or not j["feeds"]:
            return None
        feed = j["feeds"][0]
        # map fields: field1, field2, field3 to your sensors
        temperature = float(feed.get("field1")) if feed.get("field1") else None
        humidity = float(feed.get("field2")) if feed.get("field2") else None
        weight = float(feed.get("field3")) if feed.get("field3") else None
        # ThingSpeak can include location in channel metadata or feed (if using location fields)
        lat = float(feed.get("latitude")) if feed.get("latitude") else None
        lon = float(feed.get("longitude")) if feed.get("longitude") else None
        return {
            "device_id": f"thingspeak_{THINGSPEAK_CHANNEL_ID}",
            "timestamp": feed.get("created_at"),
            "temperature": temperature,
            "humidity": humidity,
            "weight": weight,
            "lat": lat,
            "lon": lon
        }
    except Exception as e:
        print("ThingSpeak fetch error:", e)
        return None

# ----------------------------
# Optional background polling (start on server launch)
# ----------------------------
def poll_thingspeak_periodically(interval=30):
    while True:
        try:
            data = fetch_latest_from_thingspeak()
            if data:
                process_reading(data["device_id"], time.time(), data["lat"], data["lon"], data["temperature"], data["humidity"], data["weight"])
        except Exception as e:
            print("Poll error:", e)
        time.sleep(interval)

def start_poll_thread():
    if "<YOUR_CHANNEL_ID>" in THINGSPEAK_CHANNEL_ID:
        print("ThingSpeak not configured - skipping poll thread.")
        return
    th = threading.Thread(target=poll_thingspeak_periodically, args=(30,), daemon=True)
    th.start()

# ----------------------------
# App start
# ----------------------------
if __name__ == "__main__":
    # Start optional poller
    start_poll_thread()
    app.run(host="0.0.0.0", port=5000, debug=False)
