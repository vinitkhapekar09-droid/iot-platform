#!/usr/bin/env python3
"""
Test script for anomaly detection service with DigitalOcean Spaces integration.
Tests: training, Spaces upload, model cache, ingest, and anomaly scoring.
"""

import json
import time
import requests
import sys
from pathlib import Path

BASE_URL = "http://localhost:8000"
SPACES_BUCKET = "iot-anomaly-models-dev"


def print_section(title: str):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def test_health():
    """Test if backend is running."""
    print_section("1. Testing Backend Health")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        if resp.status_code == 200:
            print("✓ Backend is running")
            print(f"  Response: {resp.json()}")
            return True
        else:
            print(f"✗ Backend returned status {resp.status_code}")
            return False
    except Exception as e:
        print(f"✗ Cannot connect to backend: {e}")
        print(f"  Make sure backend is running: python -m uvicorn app.main:app --reload")
        return False


def test_spaces_config():
    """Check if Spaces is configured."""
    print_section("2. Checking DigitalOcean Spaces Configuration")
    try:
        from app.config import settings
        from app.services.spaces_client import SpacesClient
        
        print(f"Spaces Region: {settings.do_spaces_region}")
        print(f"Spaces Bucket: {settings.do_spaces_bucket}")
        print(f"Spaces Endpoint: {settings.do_spaces_endpoint}")
        
        spaces = SpacesClient()
        if spaces.enabled:
            print("✓ Spaces client is enabled")
            
            # Try to list objects
            try:
                result = spaces.get_json("models/test.json")
                print("✓ Can connect to Spaces (tested read)")
            except Exception as e:
                if "NoSuchKey" in str(e) or "404" in str(e):
                    print("✓ Can connect to Spaces (test key not found, which is expected)")
                else:
                    print(f"⚠ Spaces error: {e}")
            return True
        else:
            print("✗ Spaces client is NOT enabled - check .env file")
            return False
    except Exception as e:
        print(f"✗ Error checking Spaces: {e}")
        return False


def test_local_registry():
    """Check local model registry."""
    print_section("3. Checking Local Model Registry")
    try:
        registry_path = Path(__file__).parent / "models" / "model_registry.json"
        if registry_path.exists():
            with open(registry_path) as f:
                registry = json.load(f)
            stream_count = len(registry.get("streams", {}))
            print(f"✓ Found {stream_count} streams in local registry")
            if stream_count > 0:
                for key, meta in list(registry["streams"].items())[:2]:
                    print(f"  - {key}: storage_backend={meta.get('storage_backend', 'local')}")
            return True
        else:
            print(f"⚠ Registry not yet created at: {registry_path}")
            return True
    except Exception as e:
        print(f"✗ Error reading registry: {e}")
        return False


def train_model(project_id: str, device_id: str, metric_name: str, token: str):
    """Train a model and upload to Spaces."""
    print_section("4. Training Model (Upload to Spaces)")
    
    url = f"{BASE_URL}/alerts/{project_id}/anomaly/train/{device_id}/{metric_name}"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        print(f"Sending POST {url}")
        resp = requests.post(url, headers=headers, timeout=30)
        print(f"Status: {resp.status_code}")
        
        data = resp.json()
        print(json.dumps(data, indent=2))
        
        if resp.status_code == 200:
            if data.get("status") == "success":
                storage_backend = data.get("storage_backend")
                model_key = data.get("model_key")
                print(f"\n✓ Model trained successfully")
                print(f"  Backend: {storage_backend}")
                print(f"  Key: {model_key}")
                return True, data
            elif data.get("status") == "insufficient_data":
                print(f"⚠ Not enough data: {data.get('message')}")
                return False, data
        else:
            print(f"✗ Training failed: {data.get('detail', 'Unknown error')}")
            return False, data
    except Exception as e:
        print(f"✗ Error training model: {e}")
        return False, None


def verify_spaces_upload(model_key: str):
    """Verify model was uploaded to Spaces."""
    print_section("5. Verifying Spaces Upload")
    
    try:
        from app.services.spaces_client import SpacesClient
        from app.config import settings
        
        spaces = SpacesClient()
        if not spaces.enabled:
            print("⚠ Spaces not enabled, skipping verification")
            return True
        
        print(f"Checking for model: {model_key}")
        
        payload = spaces.download_bytes(model_key)
        if payload:
            print(f"✓ Model downloaded from Spaces ({len(payload)} bytes)")
            
            # Try to load it
            import joblib
            from io import BytesIO
            try:
                model = joblib.load(BytesIO(payload))
                print(f"✓ Model is valid joblib file")
                return True
            except Exception as e:
                print(f"✗ Model load failed: {e}")
                return False
        else:
            print(f"✗ Could not find model at {model_key}")
            return False
    except Exception as e:
        print(f"✗ Error verifying upload: {e}")
        return False


def test_ingest_and_scoring(project_id: str, device_id: str, metric_name: str, api_key: str):
    """Send a reading through ingest and check anomaly scoring."""
    print_section("6. Testing Ingest & Anomaly Scoring")
    
    url = f"{BASE_URL}/ingest"
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    payload = {
        "device_id": device_id,
        "metric_name": metric_name,
        "metric_value": 25.5,
        "unit": "C"
    }
    
    try:
        print(f"Sending reading: {metric_name}={payload['metric_value']}")
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 201:
            data = resp.json()
            reading_id = data.get("id")
            print(f"✓ Reading ingested: {reading_id}")
            print(json.dumps(data, indent=2))
            return True, reading_id
        else:
            print(f"✗ Ingest failed: {resp.text}")
            return False, None
    except Exception as e:
        print(f"✗ Error during ingest: {e}")
        return False, None


def verify_anomaly_event(project_id: str, device_id: str, metric_name: str, token: str):
    """Verify anomaly event was created."""
    print_section("7. Verifying Anomaly Event")
    
    url = f"{BASE_URL}/data/{project_id}/anomalies"
    params = {
        "device_id": device_id,
        "metric_name": metric_name,
        "only_flagged": False,
        "limit": 5
    }
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                event = data[0]
                print(f"✓ Found anomaly event")
                print(f"  ID: {event.get('id')}")
                print(f"  Score: {event.get('anomaly_score')}")
                print(f"  Is Anomaly: {event.get('is_anomaly')}")
                print(f"  Model: {event.get('model_name')} {event.get('model_version')}")
                print(f"  Reason: {event.get('reason')}")
                return True
            else:
                print(f"⚠ No anomaly events found yet (might not have completed)")
                return True
        else:
            print(f"✗ Failed to fetch events: {resp.text}")
            return False
    except Exception as e:
        print(f"✗ Error verifying event: {e}")
        return False


def test_model_cache():
    """Test model cache behavior."""
    print_section("8. Testing Model Cache")
    
    try:
        from app.services.anomaly_service import _model_cache
        from app.config import settings
        
        print(f"Cache TTL: {settings.anomaly_model_cache_ttl_seconds}s")
        print(f"Cache max entries: {settings.anomaly_model_cache_max_entries}")
        print(f"Current cache size: {len(_model_cache)} entries")
        
        if _model_cache:
            print("\nCached models:")
            for key, entry in _model_cache.items():
                print(f"  - {key}")
                print(f"    Version: {entry.get('version')}")
                print(f"    Expires: ~{(entry.get('expires_at') - __import__('datetime').datetime.utcnow()).total_seconds():.0f}s")
        
        print("✓ Cache check completed")
        return True
    except Exception as e:
        print(f"⚠ Cache check error: {e}")
        return True


def main():
    print("\n" + "="*70)
    print("  ANOMALY DETECTION SERVICE TEST SUITE")
    print("="*70)
    
    # Run basic checks
    if not test_health():
        print("\n❌ Backend is not running. Cannot proceed.")
        sys.exit(1)
    
    test_spaces_config()
    test_local_registry()
    
    # Get user input for testing
    print_section("Input Required")
    print("To test training and scoring, provide:")
    print("  - A project_id (UUID from your database)")
    print("  - A device_id with at least 100 readings")
    print("  - A metric_name (temperature, humidity, etc.)")
    print("  - Your auth token (from /auth/login)")
    print("  - Device API key (from device registration)")
    
    project_id = input("\nProject ID: ").strip()
    device_id = input("Device ID: ").strip()
    metric_name = input("Metric Name: ").strip()
    token = input("Auth Token (for UI access): ").strip()
    api_key = input("Device API Key (for ingest): ").strip()
    
    if not all([project_id, device_id, metric_name, token, api_key]):
        print("\n❌ Missing required inputs.")
        sys.exit(1)
    
    # Run tests
    success, train_data = train_model(project_id, device_id, metric_name, token)
    
    if success and train_data:
        model_key = train_data.get("model_key")
        if model_key:
            verify_spaces_upload(model_key)
        
        time.sleep(2)
        test_ingest_and_scoring(project_id, device_id, metric_name, api_key)
        time.sleep(1)
        verify_anomaly_event(project_id, device_id, metric_name, token)
    
    test_model_cache()
    
    print_section("Test Summary")
    print("✓ All basic tests completed")
    print("\nNext steps:")
    print("  1. Check backend logs for cache hit/miss messages")
    print("  2. Verify model files in Spaces bucket")
    print("  3. Send more readings to test cache reuse")
    print("  4. Monitor anomaly score trends over time")


if __name__ == "__main__":
    main()
