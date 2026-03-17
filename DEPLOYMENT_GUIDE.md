# 🚀 PRECURSOR – Render Deployment Guide

Deploy both backends to Render, then build an Android APK.

---

## Architecture Overview

```
┌──────────────────────┐     ┌──────────────────────┐
│   Render Service 1   │     │   Render Service 2   │
│   Node.js Backend    │◄────│   ML/Flask Backend    │
│   (Express + SQLite) │     │   (TF + ThingSpeak)   │
│   Port: $PORT        │     │   Port: $PORT         │
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           │  ┌──────────────────────┐  │
           └──┤  Android APK / Web   ├──┘
              │  (React Native/Expo) │
              └──────────────────────┘
                        │
              ThingSpeak IoT Cloud
```

---

## Step 1: Deploy Node.js Backend to Render

### 1.1 Push `precursor-backend/` to a GitHub repo

> If you have a monorepo, Render supports setting the root directory.

### 1.2 Create a New Web Service on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `precursor-api` |
| **Root Directory** | `precursor-backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free |

### 1.3 Add Environment Variables

| Variable | Value |
|----------|-------|
| `PORT` | *(Leave blank – Render auto-sets this)* |
| `JWT_SECRET` | `precursor_jwt_secret_key_2026` |
| `NODE_ENV` | `production` |

### 1.4 Deploy

Click **Create Web Service** → Wait for build to complete.

**Your URL will be:** `https://precursor-api-XXXX.onrender.com`

> ⚠️ **Free tier:** Server sleeps after 15 min of inactivity. First request after sleep takes ~30s to spin up.

---

## Step 2: Deploy ML Backend to Render

### 2.1 Create Another Web Service

1. Go to Render → **New** → **Web Service**
2. Connect same repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `precursor-ml` |
| **Root Directory** | `ML/backend` |
| **Environment** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120 --workers 1 --threads 4` |
| **Instance Type** | Free |

> **Why `gunicorn`?** Flask's dev server isn't production-ready. Gunicorn handles concurrent requests properly.
>
> **Why `--workers 1`?** TensorFlow models use a lot of memory. 1 worker keeps us within Render's free tier limits.

### 2.2 Add Environment Variables

| Variable | Value |
|----------|-------|
| `PORT` | *(Leave blank – Render auto-sets this)* |
| `NODE_BACKEND_URL` | `https://precursor-api-XXXX.onrender.com` ← *Your Node.js URL from Step 1* |
| `THINGSPEAK_CHANNEL_ID` | `2840153` |
| `THINGSPEAK_READ_API_KEY` | `FZOQBM2TE6GBK0B3` |
| `THINGSPEAK_WRITE_API_KEY` | `6YJ4420Z49FVHT8I` |
| `ENABLE_AUTO_POLLING` | `true` |
| `THINGSPEAK_POLL_INTERVAL` | `120` |

> **Note on polling interval:** Set to 120 seconds (2 min) for free tier to reduce resource usage. ThingSpeak free tier has a 15-second minimum between writes.

### 2.3 Important: ML Model Files

The ML models (`isolation_forest.joblib`, `lstm_autoencoder.h5`, `lstm_scaler.joblib`) and `expected_route.csv` **must be included** in your repo. They are loaded at startup.

Make sure these files exist in your repo:
```
ML/backend/
├── ml/
│   ├── isolation_forest.joblib
│   ├── lstm_autoencoder.h5
│   ├── lstm_scaler.joblib
│   └── inference.py
├── data/
│   └── expected_route.csv
├── app.py
├── requirements.txt
└── ...
```

### 2.4 Deploy

Click **Create Web Service** → Wait for build to complete.

**Your URL will be:** `https://precursor-ml-XXXX.onrender.com`

---

## Step 3: Verify Both Backends

Open browser or PowerShell:

```powershell
# Test Node.js backend
Invoke-RestMethod -Uri "https://precursor-api-XXXX.onrender.com/health"
# Expected: { status: "ok", timestamp: "..." }

# Test ML backend
Invoke-RestMethod -Uri "https://precursor-ml-XXXX.onrender.com/health"
# Expected: { status: "running", auto_polling: true, poll_interval: 120 }
```

---

## Step 4: Update Frontend with Render URLs

### 4.1 Update `app.json`

Open `precursor-frontend/app.json` and set the production URLs:

```json
"extra": {
  "apiUrl": "https://precursor-api-XXXX.onrender.com",
  "mlApiUrl": "https://precursor-ml-XXXX.onrender.com"
}
```

Replace `XXXX` with your actual Render subdomain.

### 4.2 How It Works

The `config/api.js` file automatically picks up these URLs:
- **Development (Expo Go):** Uses `localhost` / device IP (URLs are empty strings)
- **Production (APK):** Uses the Render URLs from `app.json > extra`

---

## Step 5: Build Android APK

### Option A: EAS Build (Recommended)

```powershell
cd precursor-frontend

# Install EAS CLI (one-time)
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile preview
```

Create an `eas.json` in `precursor-frontend/`:
```json
{
  "cli": { "version": ">= 3.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Option B: Local Build (No Expo account needed)

```powershell
cd precursor-frontend
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

---

## Step 6: Test the APK

1. Install the APK on your Android device
2. Open the app → Login screen should appear
3. Check logs: API should connect to your Render URLs
4. Test all features (refer to CLIENT_TESTING_GUIDE.md)

---

## Key Deployment Considerations

### ThingSpeak Polling (Handled ✅)
The ThingSpeak auto-poller runs as a **background thread** inside the ML Flask app. When deployed to Render, it automatically starts polling ThingSpeak every 120 seconds.

### GPS Simulation (Handled ✅)
GPS simulation runs inside the Node.js backend as `setInterval`. It works on Render just like locally.

### GPS Deviation Demo (Handled ✅)
Added endpoints to simulate route deviation:
- `POST /simulate/deviate` → Moves GPS off-route
- `POST /simulate/return-route` → Returns GPS to authorized route

### Database (SQLite)
- SQLite works on Render but data resets on each deploy/restart
- Default users are auto-created on startup
- For persistent data, upgrade to Render's PostgreSQL (free tier available)

### Free Tier Limitations
| Limitation | Impact | Workaround |
|------------|--------|------------|
| Server sleeps after 15 min | First request takes ~30s | Use UptimeRobot to ping `/health` every 14 min |
| 512 MB RAM | TensorFlow may be tight | Use `--workers 1` for gunicorn |
| No persistent disk | DB resets on deploy | Default users auto-created |

---

## Quick Reference: Environment Variables

### Node.js Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port (Render auto-sets) |
| `JWT_SECRET` | `precursor_jwt_...` | JWT signing secret |

### ML Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port (Render auto-sets) |
| `NODE_BACKEND_URL` | `http://localhost:3000` | Node.js backend URL |
| `THINGSPEAK_CHANNEL_ID` | `2840153` | ThingSpeak channel |
| `THINGSPEAK_READ_API_KEY` | config file | ThingSpeak read key |
| `THINGSPEAK_WRITE_API_KEY` | config file | ThingSpeak write key |
| `ENABLE_AUTO_POLLING` | `true` | Background poller on/off |
| `THINGSPEAK_POLL_INTERVAL` | `60` | Polling frequency (seconds) |

### Frontend (app.json)
| Field | Default | Description |
|-------|---------|-------------|
| `extra.apiUrl` | ` ` (empty = dev mode) | Node.js backend URL |
| `extra.mlApiUrl` | ` ` (empty = dev mode) | ML backend URL |
