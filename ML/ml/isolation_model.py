# ml/isolation_model.py
import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import IsolationForest

DATA = os.path.join(os.path.dirname(__file__), "..", "data", "simulated_normal.csv")
MODEL_OUT = os.path.join(os.path.dirname(__file__), "isolation_forest.joblib")

def make_features(df, window=10):
    # df has columns: sequence_id, ts, temp, hum
    X = []
    for seq, g in df.groupby("sequence_id"):
        g = g.sort_values("ts")
        temps = g['temp'].values
        hums = g['hum'].values
        for i in range(window, len(g)+1):
            win_t = temps[i-window:i]
            win_h = hums[i-window:i]
            features = [
                np.mean(win_t), np.std(win_t), win_t[-1] - win_t[0],  # temp mean, std, slope
                np.mean(win_h), np.std(win_h), win_h[-1] - win_h[0],  # hum mean, std, slope
            ]
            X.append(features)
    return np.array(X)

if __name__ == "__main__":
    df = pd.read_csv(DATA)
    X = make_features(df, window=10)
    print("Training data shape:", X.shape)
    model = IsolationForest(n_estimators=200, contamination=0.01, random_state=42)
    model.fit(X)
    joblib.dump(model, MODEL_OUT)
    print("Saved IsolationForest model to", MODEL_OUT)
