# Urban Drainage Monitor

A full-stack drainage monitoring dashboard for tracking water levels, rainfall, node status, and alerts. The React dashboard displays a live 3D drain model, recent reading trends, risk checks, a data path, overflow estimates, and in-app High Risk/Critical notifications. The FastAPI backend receives sensor readings, stores them in a local SQLite database, and exposes the API used by the dashboard.

## Project structure

- `frontend/` — React and Vite dashboard.
- `backend/` — FastAPI application, SQLite database setup, and reading simulator.

## Requirements

- Python 3.10 or newer
- Node.js and npm
- Git

## Run on Windows

Clone the repository and change into its folder:

```powershell
git clone https://github.com/natraj-creator/urban_drainage_monitoring.git
cd urban_drainage_monitoring
```

Open two PowerShell windows in the project folder.

### 1. Start the backend

In the first window:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API documentation is available at <http://localhost:8000/docs>.

### 2. Start the frontend

In the second window:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

### 3. Optional: start sample readings

To populate the dashboard with simulated readings, open a third PowerShell window:

```powershell
cd urban_drainage_monitoring\backend
.\.venv\Scripts\Activate.ps1
python simulator.py
```

Stop the simulator with `Ctrl+C`. Stop the backend and frontend with `Ctrl+C` in their respective windows.

## Real hardware

The gateway should send JSON readings to `POST http://<backend-host>:8000/api/readings`:

```json
{
  "node_id": "NODE-1",
  "water_level_pct": 42.5,
  "rainfall_mm": 3.2,
  "battery_pct": 87
}
```

Run the backend on a host that the gateway can reach. For devices on the same local network, use the backend computer's LAN address instead of `localhost`. Do not expose the development server or backend publicly without appropriate authentication and network protections.

## Notes

- The local SQLite database is created when the backend starts and is intentionally not committed.
- Overflow timing is a linear estimate based on recent readings, not a guarantee.
- High Risk and Critical notifications are in-app only. External SMS, WhatsApp, and email delivery are not configured.
