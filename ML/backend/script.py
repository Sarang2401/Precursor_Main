import requests
import os
from dotenv import load_dotenv

load_dotenv()

CHANNEL_ID = os.getenv("THINGSPEAK_CHANNEL_ID")
API_KEY = os.getenv("THINGSPEAK_READ_API_KEY")

def fetch_thingspeak_latest():
    url = f"https://api.thingspeak.com/channels/{CHANNEL_ID}/feeds/last.json"
    params = {"api_key": API_KEY}

    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    return {
        "temperature": float(data["field1"]),
        "load": float(data["field2"]),
        "timestamp": data["created_at"]
    }
