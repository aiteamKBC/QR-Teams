# QR Teams Deployment Notes (GitHub + Hostinger)

This document covers practical production preparation without changing the current student UI flow.

## 1. GitHub push readiness checklist

- Ensure these are not committed:
  - `frontend/.env`
  - `backend/.env`
  - local logs/db artifacts
- Commit examples/docs:
  - `frontend/.env.example`
  - `backend/.env.example`
  - manifest package files under `frontend/teams-app/manifest`

## 2. Target production domains

Suggested split:

- Frontend: `https://app.yourdomain.com`
- Backend API: `https://api.yourdomain.com`

## 3. Backend production env values

Set at minimum:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=false`
- `DJANGO_ALLOWED_HOSTS=api.yourdomain.com`
- `DATABASE_URL=postgresql://...`
- `PUBLIC_FRONTEND_ORIGIN=https://app.yourdomain.com`

Graph / Teams integration values:

- `MS_GRAPH_TENANT_ID`
- `MS_GRAPH_CLIENT_ID`
- `MS_GRAPH_CLIENT_SECRET`
- `TEAMS_APP_CATALOG_ID`
- `TEAMS_MANIFEST_APP_ID`
- `TEAMS_QR_TAB_ENTITY_ID=qr-panel-static`
- `TEAMS_QR_PANEL_PUBLIC_URL=https://app.yourdomain.com/teams/qr-panel`
- `TEAMS_ACTIVITY_TYPE=attendanceReady`

## 4. Frontend production env values

Set:

- `VITE_PUBLIC_APP_BASE_URL=https://app.yourdomain.com`

Optional:

- `VITE_API_BASE_URL=https://api.yourdomain.com`

If frontend and backend are served behind one origin/reverse proxy, `VITE_API_BASE_URL` can remain unset and `/api` can be proxied at the edge.

## 5. Teams manifest values to replace for production

In `frontend/teams-app/manifest/manifest.json` replace ngrok host with real public frontend host:

- `developer.websiteUrl`
- `developer.privacyUrl`
- `developer.termsOfUseUrl`
- `staticTabs[].contentUrl`
- `staticTabs[].websiteUrl`
- `validDomains[]`

Or start from:

- `frontend/teams-app/manifest/manifest.production.template.json`
  - fill placeholder IDs and resource values
  - rename to `manifest.json` for packaging

Then re-zip and re-upload:

- `manifest.json`
- `color.png`
- `outline.png`

## 6. Notifications and deep links (supported flow)

- Use activity feed notifications (Graph) instead of forced popup.
- Deep link points to Teams entity:
  - `https://teams.microsoft.com/l/entity/{TEAMS_MANIFEST_APP_ID}/{TEAMS_QR_TAB_ENTITY_ID}?webUrl=<QR_PANEL_URL>`
- Current scaffold services:
  - `apps.teams_integration.graph_service`
  - `apps.teams_integration.graph_notification_service`

## 7. Hostinger deployment expectations

- Backend: run Django behind a production server (for example Gunicorn/Uvicorn) with HTTPS at `api.yourdomain.com`.
- Frontend: serve built static files at `app.yourdomain.com`.
- Ensure CORS/CSRF origins match the final frontend host.

## 8. Final production cutover

1. Deploy backend + frontend to Hostinger domains.
2. Validate `/teams/qr-panel` publicly on production URL.
3. Update manifest with production URLs/domains.
4. Repackage and upload app to Teams.
5. Grant admin consent for required Graph permissions.
6. Enable install/notification jobs using real tenant values.
