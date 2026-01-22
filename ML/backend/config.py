import os
from dotenv import load_dotenv

load_dotenv()

THINGSPEAK_CHANNEL_ID = os.getenv("THINGSPEAK_CHANNEL_ID")
THINGSPEAK_READ_API_KEY = os.getenv("THINGSPEAK_READ_API_KEY")
ALERT_FILE = os.getenv("ALERT_FILE", "alerts/alerts_log.jsonl")
