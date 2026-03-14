import requests
import random
import time
import threading
from datetime import datetime

BASE_URL = "http://localhost:8000"

# ─────────────────────────────────────────
# CONFIGURATION
# After creating users/projects via Swagger,
# fill in the API keys below
# ─────────────────────────────────────────

DEVICES = [
    {
        "name": "esp32-living-room",
        "api_key": "iotk_5b2cfad8110aec1a783eaa21b2dff9af55fd9ffae0c52e00",
        "metrics": [
            {"name": "temperature", "min": 20, "max": 30, "unit": "celsius"},
            {"name": "humidity", "min": 40, "max": 70, "unit": "percent"},
        ],
    },
    {
        "name": "esp32-bedroom",
        "api_key": "iotk_5b2cfad8110aec1a783eaa21b2dff9af55fd9ffae0c52e00",
        "metrics": [
            {"name": "temperature", "min": 18, "max": 26, "unit": "celsius"},
            {"name": "humidity", "min": 50, "max": 80, "unit": "percent"},
            {"name": "light", "min": 0, "max": 100, "unit": "percent"},
        ],
    },
    {
        "name": "outdoor-sensor",
        "api_key": "iotk_ce8865a7e7563c83f592fe2d91da2a53fbd9cc1274773453",
        "metrics": [
            {"name": "temperature", "min": 15, "max": 40, "unit": "celsius"},
            {"name": "humidity", "min": 30, "max": 90, "unit": "percent"},
            {"name": "pressure", "min": 1000, "max": 1025, "unit": "hPa"},
        ],
    },
    {
        "name": "office-desk",
        "api_key": "iotk_0dbcd20aa93846ba264784ef1ee6ea6e1d6b60d90879020f",
        "metrics": [
            {"name": "temperature", "min": 20, "max": 28, "unit": "celsius"},
            {"name": "co2", "min": 400, "max": 1200, "unit": "ppm"},
        ],
    },
    {
        "name": "server-rack",
        "api_key": "iotk_9ce00b657dedeb14e7da56971a1202f481f47f21ee3ed928",
        "metrics": [
            {"name": "temperature", "min": 35, "max": 55, "unit": "celsius"},
            {"name": "humidity", "min": 20, "max": 40, "unit": "percent"},
        ],
    },
]


def send_reading(device_name, api_key, metric_name, value, unit):
    try:
        response = requests.post(
            f"{BASE_URL}/ingest",
            json={
                "device_id": device_name,
                "metric_name": metric_name,
                "metric_value": round(value, 2),
                "unit": unit,
            },
            headers={"x-api-key": api_key},
            timeout=5,
        )
        if response.status_code == 201:
            print(f"  ✅ [{device_name}] {metric_name}: {round(value, 2)} {unit}")
        else:
            print(f"  ❌ [{device_name}] Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"  ❌ [{device_name}] Exception: {e}")


def run_device(device):
    """Each device runs in its own thread."""
    name = device["name"]
    api_key = device["api_key"]
    metrics = device["metrics"]

    # Random interval per device (5-15 seconds) to simulate real devices
    interval = random.randint(5, 15)
    print(f"🔌 Device [{name}] started — sending every {interval}s")

    while True:
        print(f"\n📡 [{name}] sending at {datetime.now().strftime('%H:%M:%S')}")
        for metric in metrics:
            value = random.uniform(metric["min"], metric["max"])
            send_reading(name, api_key, metric["name"], value, metric["unit"])
        time.sleep(interval)


def main():
    print("=" * 55)
    print("  🚀 Multi-Device IoT Simulator")
    print(f"  Target: {BASE_URL}")
    print(f"  Devices: {len(DEVICES)}")
    print("=" * 55)

    # Check for unfilled keys
    unfilled = [d["name"] for d in DEVICES if "FILL_IN" in d["api_key"]]
    if unfilled:
        print("\n⚠️  WARNING: These devices have placeholder API keys:")
        for name in unfilled:
            print(f"   - {name}")
        print("\nFill in the API keys in simulate_multi.py before running.")
        print("See instructions below.\n")
        return

    # Start each device in its own thread
    threads = []
    for device in DEVICES:
        t = threading.Thread(target=run_device, args=(device,), daemon=True)
        t.start()
        threads.append(t)
        time.sleep(0.5)  # small stagger so output is readable

    print(f"\n✅ All {len(DEVICES)} devices running. Press Ctrl+C to stop.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")


if __name__ == "__main__":
    main()
