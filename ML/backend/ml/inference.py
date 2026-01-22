import numpy as np
import joblib
from collections import deque
from tensorflow.keras.models import load_model

# ---------------- LOAD MODELS ----------------
if_model = joblib.load("ml/isolation_forest.joblib")
lstm_model = load_model("ml/lstm_autoencoder.h5", compile=False)
lstm_scaler = joblib.load("ml/lstm_scaler.joblib")

# ---------------- CONFIG ----------------
WINDOW_SIZE = 10
LSTM_THRESHOLD = 0.05

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

def run_ml(device_id, temp, hum, weight):
    buf = _get_buffer(device_id)

    buf["temp"].append(temp)
    buf["hum"].append(hum)
    buf["weight"].append(weight)

    if len(buf["temp"]) < WINDOW_SIZE:
        return {
            "risk": "LOW",
            "alerts": [],
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
    X_scaled = lstm_scaler.transform(X_lstm)

    
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

    # ---------------- Ensemble ----------------
    risk = "HIGH" if if_anomaly or lstm_error > LSTM_THRESHOLD else "LOW"

    return {
        "if_score": if_score,
        "if_anomaly": if_anomaly,
        "lstm_error": lstm_error,
        "risk": risk,
        "alerts": alerts,
        "categories": list(set(categories))
    }
