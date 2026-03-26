import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, projects, ingest, data, chatbot, alerts
from app.services.alert_service import run_offline_alert_monitor

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://localhost:5173",
        "https://aiot-platform.vercel.app",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(ingest.router)
app.include_router(data.router)
app.include_router(chatbot.router)
app.include_router(alerts.router)


@app.on_event("startup")
async def startup_event():
    app.state.offline_monitor_task = asyncio.create_task(
        run_offline_alert_monitor(interval_seconds=300)
    )


@app.on_event("shutdown")
async def shutdown_event():
    task = getattr(app.state, "offline_monitor_task", None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
    }
