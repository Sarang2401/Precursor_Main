# ml/train_isolation.py
import numpy as np
import pandas as pd
import os
from datetime import datetime, timedelta

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "simulated_normal.csv")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

def simulate_normal(num_sequences=200, seq_len=50):
    rows = []
    for s in range(num_sequences):
        # baseline varies slightly per sequence (simulating different shipments)
        base_temp = 22 + np.random.normal(0, 1)
        base_hum  = 50 + np.random.normal(0, 3)
        start = datetime.now()
        for t in range(seq_len):
            ts = start + timedelta(seconds=t*10)
            # small normal noise + slow drift
            temp = base_temp + np.random.normal(0, 0.5) + 0.01 * np.sin(t/5)
            hum  = base_hum  + np.random.normal(0, 1.0) + 0.02 * np.cos(t/7)
            rows.append({
                "sequence_id": s,
                "ts": ts.timestamp(),
                "temp": temp,
                "hum": hum
            })
    return pd.DataFrame(rows)

if __name__ == "__main__":
    df = simulate_normal()
    df.to_csv(OUT, index=False)
    print("Saved simulated normal data to", OUT)
