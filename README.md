# EviLog

Low-cost, hardware-assisted evidence tracking system that digitally records evidence movement and chain of custody.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Python 3.12+ + FastAPI
- Database: MongoDB
- Hardware: ESP32-S3 + RFID + physical presence sensor + camera

## Development

### Backend

Create and activate a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Run the API:

```powershell
uvicorn app.main:app --reload
```

### Frontend

The frontend will live in `frontend/`.

Create it with Vite:

```powershell
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

Start the development server:

```powershell
npm run dev
```

### Database

Run MongoDB locally. The backend will use an environment variable for the MongoDB connection string. Do not commit secrets.

## System Concept

EviLog stores case/FIR data, evidence records, officers, reusable RFID tags, RFID assignment history, transactions, chain-of-custody records, and security/tamper alerts.

RFID tags are reusable. `RFID_TAG` represents the physical tag and its current availability, while `RFID_MAPPING` records historical assignments between tags and evidence.

The hardware identifies the officer and evidence, detects physical presence/removal, and sends events to the FastAPI API. The backend validates events and updates evidence status and history.

## Project Structure

```text
EviLog/
├── frontend/                 # React application
├── backend/                  # FastAPI application
├── hardware/                 # ESP32-S3 firmware
├── docs/                     # Project documentation
├── module testing/           # Hardware/module testing
├── requirements.txt          # Backend dependencies
├── pyproject.toml            # Python project metadata
└── README.md
```

## Scope

EviLog is a prototype for evidence tracking and custody workflows. It complements rather than replaces an existing police/FIR management system.
