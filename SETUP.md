# EviLog Setup Guide

This guide explains how to set up the project from scratch, install dependencies, configure environment variables, and run both the backend and frontend.

## 1) Clone the project

```powershell
git clone <https://github.com/44ompatil/EviLog.git>
cd EviLog
```

## 2) Create a Python virtual environment

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## 3) Install backend dependencies

Install Python packages from the root `requirements.txt`:

```powershell
pip install -r requirements.txt
```

This file is at:

```text
EviLog/requirements.txt
```

## 4) Create the environment file

The backend reads environment variables from a file named `.env`.

Create it in the backend folder:

```text
EviLog/backend/.env
```

contents:

```env
MONGODB_URL=<Connection String>
DATABASE_NAME=evilog
```

Notes:
- Do not commit the real `.env` file to Git.
- It is already ignored in `.gitignore`.
- If MongoDB is not installed locally, install MongoDB Community Edition or use a cloud MongoDB Atlas URL instead.

## 5) Run the backend

From the project root:

```powershell
cd backend
uvicorn app.main:app --reload
```

The API should start and be available at:

```text
http://127.0.0.1:8000
```

Quick health check:

```text
http://127.0.0.1:8000/api/health
```

## 6) Install frontend dependencies

Open a new terminal and go to the frontend folder:

```powershell
cd EviLog/frontend
npm install
```

## 7) Run the frontend

Start the Vite app:

```powershell
npm run dev
```

The frontend should usually run at:

```text
http://localhost:5173
```

## 8) Project structure summary

```text
EviLog/
├── backend/
│   ├── .env                # local environment file (do not commit)
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       └── ...
├── frontend/
│   ├── package.json
│   ├── src/
│   └── ...
├── requirements.txt
├── README.md
├── SETUP.md
├── pyproject.toml
├── .gitignore
├── docs/
├── module testing/
└── .venv/                 # local virtual environment (do not commit)
```

## 9) Common troubleshooting

### Backend import issues
```powershell
pip install -r requirements.txt
```

### Frontend install issues
```powershell
rm -rf node_modules package-lock.json
npm install
```

On Windows PowerShell, use:
```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### MongoDB connection issues
- Make sure MongoDB is running locally.
- Check that your `.env` file is inside `backend/.env`.
- Confirm the connection string is correct.

## 10) Git best practices

Do not push these files:
- `.env`
- `.venv/`
- `node_modules/`
- local database files

Use `.gitignore` to keep them out of Git.

## 11) Quick start commands

```powershell
cd EviLog
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd backend
copy NUL .env
# then add:
# MONGODB_URL=<Connection String>
# DATABASE_NAME=evilog

start "Backend" cmd /k "cd /d D:\COLLEGE\Projects\EviLog\backend && uvicorn app.main:app --reload"

start "Frontend" cmd /k "cd /d D:\COLLEGE\Projects\EviLog\frontend && npm install && npm run dev"
```

## 12) Final note

If you encounter any errors solve it and add it here so it will help others 
