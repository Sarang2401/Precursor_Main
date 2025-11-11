import numpy as np
import pandas as pd
import os
from datetime import datetime
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, RepeatVector, TimeDistributed, Dense
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.models import load_model

DATA = os.path.join(os.path.dirname(__file__), "..", "data", "simulated_normal.csv")
MODEL_OUT = os.path.join(os.path.dirname(__file__), "lstm_autoencoder.h5")

# --------------------------
# 1️⃣ Load Data
# --------------------------
df = pd.read_csv(DATA)
df = df.sort_values(["sequence_id", "ts"]).reset_index(drop=True)

# normalize columns
from sklearn.preprocessing import MinMaxScaler
scaler = MinMaxScaler()
df[["temp", "hum"]] = scaler.fit_transform(df[["temp", "hum"]])

# --------------------------
# 2️⃣ Create sequential windows
# --------------------------
SEQ_LEN = 30   # number of timesteps per sequence
features = ["temp", "hum"]

def make_sequences(df, seq_len=SEQ_LEN):
    X = []
    for seq, g in df.groupby("sequence_id"):
        g = g[features].values
        for i in range(len(g) - seq_len):
            X.append(g[i:i+seq_len])
    return np.array(X)

X = make_sequences(df, SEQ_LEN)
print("Training sequences:", X.shape)  # (num_samples, timesteps, features)

# --------------------------
# 3️⃣ Build LSTM Autoencoder
# --------------------------
model = Sequential([
    LSTM(64, activation='relu', input_shape=(SEQ_LEN, len(features)), return_sequences=False),
    RepeatVector(SEQ_LEN),
    LSTM(64, activation='relu', return_sequences=True),
    TimeDistributed(Dense(len(features)))
])

model.compile(optimizer='adam', loss='mse')

# --------------------------
# 4️⃣ Train model
# --------------------------
es = EarlyStopping(monitor='loss', patience=5, restore_best_weights=True)
model.fit(X, X, epochs=30, batch_size=32, shuffle=True, callbacks=[es])

# --------------------------
# 5️⃣ Save model + scaler
# --------------------------
model.save(MODEL_OUT)
import joblib
joblib.dump(scaler, os.path.join(os.path.dirname(__file__), "lstm_scaler.joblib"))

print("✅ LSTM Autoencoder saved to", MODEL_OUT)
