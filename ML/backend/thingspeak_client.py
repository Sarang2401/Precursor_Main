import requests
from config import THINGSPEAK_CHANNEL_ID, THINGSPEAK_READ_API_KEY

def fetch_thingspeak():
    if not THINGSPEAK_CHANNEL_ID or not THINGSPEAK_READ_API_KEY:
        return None

    url = f"https://api.thingspeak.com/channels/{THINGSPEAK_CHANNEL_ID}/feeds/last.json"
    r = requests.get(url, params={"api_key": THINGSPEAK_READ_API_KEY}, timeout=5)
    data = r.json()

    return {
        "temp": float(data.get("field1", 0)),
        "hum": float(data.get("field2", 0)),
        "weight": float(data.get("field3", 0))
    }
