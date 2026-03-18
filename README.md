# QR Teams

Production-oriented Teams meeting app for attendance QR workflows.

## Repository structure

- `backend/` Django API + Teams integration scaffolding (Graph install + notifications).
- `frontend/` React Teams tab experience (student panel route `/teams/qr-panel`).
- `frontend/teams-app/manifest/` Teams app package files (`manifest.json`, icons, production template).
- `DEPLOYMENT_HOSTINGER.md` Practical GitHub + Hostinger cutover notes.

## Current architecture highlights

- Student UI is fixed static image in the QR panel route.
- Teams app uses meeting-friendly static tab structure.
- Backend includes scaffold services for:
  - app install to meeting chat via Graph
  - activity notification + deep link to QR tab

## Before pushing to GitHub

- Verify `backend/.env` and `frontend/.env` are not staged.
- Fill only `.env.example` templates with placeholders, never real secrets.
