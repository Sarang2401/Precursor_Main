import requests, time
url = "http://127.0.0.1:5000/report"
payload = {
    "device_id": "truck_demo",
    "timestamp": time.time(),
    "lat": 19.1216,
    "lon": 72.9815,
    "temp": 35.0,
    "hum": 40.0,
    "weight": 12.3
}
r = requests.post(url, json=payload)
print(r.status_code, r.json())
