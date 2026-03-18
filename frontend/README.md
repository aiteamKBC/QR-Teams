# QR Teams Frontend

## Current student route

- `/teams/qr-panel` - fixed static attendance image for students.

## API behavior

- If `VITE_API_BASE_URL` is set, frontend uses it for API calls.
- If `VITE_API_BASE_URL` is not set, frontend uses same-origin `/api/...`.
- In single-domain setups, same-origin is preferred.

## Teams manifest packaging

Manifest files are under `frontend/teams-app/manifest`.

Zip and upload only:

- `manifest.json`
- `color.png`
- `outline.png`

## Moving from ngrok to real domain

When switching to production domain:

1. Update `manifest.json` URLs and `validDomains` from ngrok to your real domain.
2. Update frontend env values:
   - `VITE_PUBLIC_APP_BASE_URL=https://app.yourdomain.com`
   - `VITE_API_BASE_URL=https://api.yourdomain.com` (or leave empty for same-origin reverse proxy).
3. Re-zip manifest package and re-upload app to Teams.
