# Anomaly Detection Service with DigitalOcean Spaces

Quick start guide for testing and deploying the anomaly detection service.

## Setup

### 1. Install Dependencies
```powershell
cd iot-platform\backend
pip install -r requirements.txt
```

### 2. Verify `.env` Configuration
Ensure your backend `.env` file has all required DigitalOcean Spaces credentials before starting the server. (See `.env.example` or ask admin for configuration details.)

### 3. Start Backend Server
```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Testing

### Run Full Test Suite
```powershell
python test_anomaly_service.py
```

The script will:
1. ✓ Check backend health
2. ✓ Verify Spaces configuration
3. ✓ Check local model registry
4. ✓ Train a model (uploads to Spaces)
5. ✓ Verify upload succeeded
6. ✓ Test ingest with anomaly scoring
7. ✓ Verify anomaly event was created
8. ✓ Check model cache status

### What You Need for Testing
- **Project ID**: UUID from your database (from `projects` table)
- **Device ID**: e.g., "esp32-bedroom-01" (must have ≥100 readings)
- **Metric Name**: e.g., "temperature"
- **Auth Token**: Get from `POST /auth/login` with your credentials
- **Device API Key**: Get from device registration in your app

### Example: Manual API Test

```powershell
# 1. Get auth token
$login = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" `
  -Method Post `
  -Body (@{email="user@example.com"; password="pass"} | ConvertTo-Json) `
  -ContentType "application/json"
$token = $login.access_token

# 2. Train a model
$project_id = "c27781ea-0deb-4682-8471-361f635dcf9a"
$device_id = "esp32-bedroom-01"
$metric_name = "temperature"

Invoke-RestMethod `
  -Uri "http://localhost:8000/alerts/$project_id/anomaly/train/$device_id/$metric_name" `
  -Method Post `
  -Headers @{"Authorization" = "Bearer $token"} | ConvertTo-Json
```

Expected response:
```json
{
  "status": "success",
  "message": "Model trained on 103 readings",
  "model_version": "v2",
  "storage_backend": "spaces",
  "model_key": "models/c27781ea.../esp32-bedroom-01_temperature/v2/model.joblib",
  "device_id": "esp32-bedroom-01",
  "metric_name": "temperature"
}
```

## How It Works

### Model Storage Flow
1. **Training**: Train Isolation Forest on historical data
2. **Versioning**: Auto-increment version (v1 → v2 → v3...)
3. **Upload**: Store model + metadata to Spaces:
   - `models/{project_id}/{device_metric}/{version}/model.joblib`
   - `models/{project_id}/{device_metric}/{version}/metadata.json`
   - `models/{project_id}/{device_metric}/latest.json` (pointer)
4. **Local Registry**: Update `models/model_registry.json` with Spaces keys

### Scoring Flow
1. **First Request**: 
   - Check registry for stream metadata
   - Cache miss → fetch from Spaces
   - Load model into memory
   - Cache with 300s TTL
2. **Subsequent Requests** (within TTL):
   - Use cached model (no Spaces call)
3. **Fallback**:
   - If Spaces unavailable, use local file
   - Cache hit/miss logged for observability

### Feature Engineering at Scoring
For each new reading, compute features on last 30 points:
- Raw value
- Rolling mean (window=10)
- Rolling std (window=10)
- Delta from previous value
- Hour-of-day (normalized)

Then score only the latest point.

## Monitoring & Debugging

### Check Cache Status
Backend logs will show:
```
Model cache hit for esp32-bedroom-01:temperature
Model cache miss for outdoor-sensor:humidity (loading from Spaces...)
Loading model from Spaces: models/.../v2/model.joblib
Caching model for ... (TTL: 300s)
```

### Verify Spaces Upload
Check your Space bucket for structure:
```
iot-anomaly-models-dev/
  models/
    c27781ea.../
      esp32-bedroom-01_temperature/
        latest.json
        v1/
          model.joblib
          metadata.json
        v2/
          model.joblib
          metadata.json
```

### Check Model Registry
```powershell
Get-Content models\model_registry.json | ConvertFrom-Json | ConvertTo-Json
```

Look for entries like:
```json
{
  "storage_backend": "spaces",
  "model_key": "models/.../v2/model.joblib",
  "latest_key": "models/.../latest.json",
  "latest_model_version": "v2"
}
```

### View Anomaly Events
```powershell
# Get latest anomalies for a device+metric
curl -H "Authorization: Bearer $token" \
  "http://localhost:8000/data/$project_id/anomalies?device_id=esp32-bedroom-01&metric_name=temperature&limit=10"
```

## Production Deployment

### DigitalOcean App Platform
1. Set all environment variables in component settings
2. Deploy backend via GitHub or container registry
3. First train request will upload models to Spaces
4. Ingest requests use cache + remote fetch

### DigitalOcean Droplet
1. Clone repo, install dependencies
2. Set env vars (in `.env` or systemd service)
3. Run with supervisor or systemd
4. Same workflow as local

### Environment Variables
All required configuration (database, Spaces credentials, cache settings, API keys) must be set in the `.env` file before deployment. Contact DevOps or check the setup documentation for the correct values.

## Troubleshooting

### "Model not found" During Scoring
- **Cause**: Model registry exists but Spaces/local file missing
- **Fix**: Retrain the model for that device/metric

### Spaces Connection Timeout
- **Cause**: Network issue or Spaces endpoint unreachable
- **Fix**: Check `DO_SPACES_ENDPOINT` is correct; service falls back to local file

### Cache Growing Too Large
- **Cause**: Too many concurrent device/metric streams trained
- **Fix**: Increase `ANOMALY_MODEL_CACHE_MAX_ENTRIES` or reduce `ANOMALY_MODEL_CACHE_TTL_SECONDS`

### Stale Model in Memory
- **Cause**: New model trained but cache not expired yet
- **Fix**: 
  - Wait for TTL to expire (default 300s)
  - Or restart backend to clear cache
  - Or implement cache invalidation signal (future)

## Next Steps

1. ✓ Run `test_anomaly_service.py` to validate setup
2. ✓ Train models for all device/metric streams
3. ✓ Verify artifacts in Spaces bucket
4. ✓ Monitor training via API endpoint
5. ✓ Set up scheduled retraining (drift detection)
6. ✓ Configure anomaly alerts based on score thresholds
7. ✓ Deploy to DigitalOcean App Platform or Droplet

See `anomaly_lab/` folder for drift detection + auto-retrain examples.
