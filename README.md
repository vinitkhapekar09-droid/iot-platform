# AI-Powered IoT Infrastructure Platform

An advanced AI-powered IoT platform designed for ingesting, analyzing, and visualizing IoT sensor data. It features real-time data ingestion, offline alert monitoring, and a built-in AI chatbot for extracting deep data insights.

## Project Structure

This repository is divided into three main components:

- **`backend/`**: A high-performance Python backend leveraging **FastAPI**, **SQLAlchemy** (async), and **PostgreSQL**.
- **`frontend/`**: A responsive web application built with **React** (Vite), **Recharts** for data visualization, and **Lucide-React** for icons.
- **`simulator/`**: Python scripts for generating synthetic IoT data and simulating device behavior.

---

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL (via `asyncpg` & Docker)
- **ORM & Migrations**: SQLAlchemy & Alembic
- **AI/ML**: Groq API, Scikit-learn, Numpy, Pandas
- **Background Tasks**: Asyncio (Offline Alert Monitor)

### Frontend
- **Framework**: React 19 (Vite)
- **Routing**: React Router DOM (v7)
- **Data Visualization**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Simulator
- Python-based scripts to easily generate synthetic IoT sensor devices and send bulk or streaming telemetry data to the backend API.

---

## Core Features

- **Device & Project Management**: Organize your IoT devices into specific projects cleanly.
- **High-Speed Data Ingestion**: REST endpoints for reliable ingestion of telemetry data.
- **Alert Monitoring**: Automated background tasks to monitor offline devices or abnormal sensory conditions, triggering alerts.
- **Visual Analytics**: Real-time charts mapped to specific device metrics utilizing Recharts.
- **AI Chatbot Integration**: Conversational AI powered by Groq to query, summarize, and understand your IoT data seamlessly.

---

## Demo Mode

The platform includes a built-in demo mode for users to explore all features without creating an account:

### Demo Features
- **Try Demo Button**: Click "Try Demo" on the login page to access the demo account instantly
- **Pre-populated Data**: Demo account comes with 7 days of realistic sensor readings from 2 devices
- **Full Feature Access**: Explore dashboards, charts, alerts, and AI chatbot functionality
- **Data Retention**: Demo data is automatically cleaned up after 7 days
- **Limitations**: 
  - 📧 Email configuration disabled
  - 🔒 Read-only access to alerts (cannot create/modify/delete)
  - 💬 Chat limited to 10 messages per day
  - 📊 Data purged automatically after 7 days

### Getting Started with Demo
1. Visit the login page
2. Click the "🎯 Try Demo" button
3. Explore the dashboard with pre-populated smart home sensor data
4. Test all features and create a real account when ready

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/)
- [Docker](https://www.docker.com/) & Docker Compose

### 1. Database Setup

Deploy the backend PostgreSQL database instantly using Docker:
```bash
docker-compose up -d
```
*(Ensure port 5432 is free on your host machine)*

### 2. Backend Setup

Navigate to the `backend` directory, establish your virtual environment, and install necessary dependencies:
```bash
cd backend
python -m venv .venv
# On Windows use: .venv\Scripts\activate
# On macOS/Linux use: source .venv/bin/activate
.venv\Scripts\activate
pip install -r requirements.txt
```

Execute database migrations to initialize the schema:
```bash
alembic upgrade head
```

Boot the FastAPI server:
```bash
uvicorn app.main:app --reload
```

### 3. Frontend Setup

Navigate to the `frontend` directory and install the required modules:
```bash
cd frontend
npm install
npm run dev
```
The application will spin up and be accessible locally at [http://localhost:5173](http://localhost:5173).

### 4. Running the Simulator

To easily populate the platform with synthetic sensory data, utilize the provided simulation scripts:
```bash
cd simulator
# Ensure any necessary dependencies (e.g., requests) are installed
python simulate.py
```
*(Check the individual scripts inside the `simulator` folder for specific behavioral parameters and multi-device simulation commands).*

---

## Configuration

Ensure appropriate Environment Variables are securely configured.

### Backend `.env`
(Create `.env` inside the `backend/` directory)
```env
# Database connection string
DATABASE_URL=postgresql+asyncpg://iotuser:iotpassword@localhost:5432/iotplatform

# Security & JWT Token Auth
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256

# External Services
FRONTEND_URL=http://localhost:5173
GROQ_API_KEY=your_groq_api_key
RESEND_API_KEY=your_resend_api_key
```

---

## Demo Mode Maintenance

To keep the demo system running smoothly, periodic maintenance tasks should be scheduled:

### Cleanup Old Demo Data
Remove demo sensor readings older than 7 days:
```bash
cd backend
python manage.py cleanup
```

### Reset Daily Chat Limits
Reset the chat message counter for demo users (should run daily):
```bash
cd backend
python manage.py reset-limits
```

### Automated Scheduling (Recommended)
For production deployments, use cron jobs to automate these tasks:

```bash
# Clean up demo data daily at 2 AM
0 2 * * * cd /path/to/backend && python manage.py cleanup

# Reset chat limits daily at 12:01 AM
1 0 * * * cd /path/to/backend && python manage.py reset-limits
```

---