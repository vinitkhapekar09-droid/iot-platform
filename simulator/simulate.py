import requests
import random
import time

# ← Paste your plain_key from Step 5 here
API_KEY = "iotk_dbd4f3308a1dc30af0219bc7505c1bc22ad525a2d7c228ea"
BASE_URL = "https://iot-platform-xbdj.onrender.com"

DEVICE_ID = "esp32-bedroom-01"


def send_reading(metric_name: str, value: float, unit: str):
    response = requests.post(
        f"{BASE_URL}/ingest",
        json={
            "device_id": DEVICE_ID,
            "metric_name": metric_name,
            "metric_value": round(value, 2),
            "unit": unit,
        },
        headers={"x-api-key": API_KEY},
    )
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Sent {metric_name}: {value} {unit} → id: {data['id'][:8]}...")
    else:
        print(f"❌ Error {response.status_code}: {response.text}")


print("🚀 IoT Simulator starting — sending every 3 seconds")
print(f"   Device: {DEVICE_ID}")
print(f"   Target: {BASE_URL}")
print()

while True:
    temperature = random.uniform(20.0, 35.0)
    humidity = random.uniform(40.0, 80.0)
    pressure = random.uniform(1000.0, 1020.0)

    send_reading("temperature", temperature, "celsius")
    send_reading("humidity", humidity, "percent")
    send_reading("pressure", pressure, "hPa")

    print(f"   --- sleeping 3s ---")
    time.sleep(3)
