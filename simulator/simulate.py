import os
import random
import time

import requests

API_KEY = os.getenv(
    "IOT_API_KEY", "iotk_ce8865a7e7563c83f592fe2d91da2a53fbd9cc1274773453"
)
BASE_URL = os.getenv("IOT_BASE_URL", "http://127.0.0.1:8000")
DEVICE_ID = os.getenv("IOT_DEVICE_ID", "esp32-bedroom-01")


def send_reading(metric_name: str, value: float, unit: str):
    try:
        response = requests.post(
            f"{BASE_URL}/ingest",
            json={
                "device_id": DEVICE_ID,
                "metric_name": metric_name,
                "metric_value": round(value, 2),
                "unit": unit,
            },
            headers={"x-api-key": API_KEY},
            timeout=5,
        )
    except requests.RequestException as exc:
        print(f"Error sending {metric_name}: {exc}")
        return

    if response.status_code == 201:
        data = response.json()
        print(f"Sent {metric_name}: {value:.2f} {unit} -> id: {data['id'][:8]}...")
    else:
        print(f"Error {response.status_code}: {response.text}")


def main():
    if "FILL_IN" in API_KEY:
        print("Set IOT_API_KEY environment variable before running.")
        return

    print("IoT Simulator starting - sending every 3 seconds")
    print(f"   Device: {DEVICE_ID}")
    print(f"   Target: {BASE_URL}")
    print()

    try:
        while True:
            temperature = random.uniform(20.0, 35.0)
            humidity = random.uniform(40.0, 80.0)
            pressure = random.uniform(1000.0, 1020.0)

            send_reading("temperature", temperature, "celsius")
            send_reading("humidity", humidity, "percent")
            send_reading("pressure", pressure, "hPa")

            print("   --- sleeping 3s ---")
            time.sleep(3)
    except KeyboardInterrupt:
        print("\nSimulator stopped.")


if __name__ == "__main__":
    main()
