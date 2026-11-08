# QR Teams

Production-oriented Teams meeting app for attendance QR workflows.

## Repository structure

- `backend/` Django API + Teams integration scaffolding (Graph install + notifications).
- `frontend/` React Teams tab experience (student panel route `/teams/qr-panel`).
- `frontend/teams-app/manifest/` Teams app package files (`manifest.json`, icons, production template).
- `DEPLOYMENT_HOSTINGER.md` Practical GitHub + Hostinger cutover notes.

## Local backend setup (PowerShell)

From the repository root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create `backend/.env` from `.env.example` if it does not already exist, then
configure it for your environment. Leave `DATABASE_URL` empty to use local
SQLite, or set it to your PostgreSQL connection string.

```powershell
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py runserver
```

Open `http://127.0.0.1:8000/` for API documentation or
`http://127.0.0.1:8000/api/teams/bot` for the health check.
These commands use the virtual environment directly; activation is optional.

## Current architecture highlights

- Student UI is fixed static image in the QR panel route.
- Teams app uses meeting-friendly static tab structure.
- Backend includes scaffold services for:
  - app install to meeting chat via Graph
  - activity notification + deep link to QR tab

## Before pushing to GitHub

- Verify `backend/.env` and `frontend/.env` are not staged.
- Fill only `.env.example` templates with placeholders, never real secrets.
