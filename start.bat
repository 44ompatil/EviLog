@echo off

set "PROJECT=D:\COLLEGE\Projects\EviLog"

echo Starting EviLog...

:: Start Backend
start "EviLog Backend" cmd /k "cd /d %PROJECT% && call .venv\Scripts\activate.bat && cd backend && uvicorn app.main:app --reload"

:: Start Frontend
start "EviLog Frontend" cmd /k "cd /d %PROJECT%\frontend && npm run dev"

echo.
echo EviLog servers started.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.