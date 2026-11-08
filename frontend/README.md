# QR Teams Frontend

## Current student route

- `/teams/qr-panel` - fixed static attendance image for students.

## API behavior

- If `VITE_API_BASE_URL` is set, frontend uses it for API calls.
- If `VITE_API_BASE_URL` is not set, frontend uses same-origin `/api/...`.
- In single-domain setups, same-origin is preferred.

## Teams manifest packaging

Manifest files are under `frontend/teams-app/manifest`.

The current package opens `https://lms.kentbusinesscollege.org/qr-attendance`
directly. See `teams-app/manifest/README.md` for packaging and update steps.
The local QR panel and tab configuration pages share this destination through
`src/attendance.ts`.

Zip and upload only:

- `manifest.json`
- `color.png`
- `outline.png`

## Changing the Teams destination

When changing the attendance destination:

1. Update `manifest.json` navigation URLs and `validDomains`, and increment its app version.
2. Update `src/attendance.ts` and backend `TEAMS_QR_PANEL_PUBLIC_URL` to the same full URL.
3. Build the frontend and re-zip the manifest package. Upload the ZIP as an update to the existing Teams app.
4. Apply frontend/backend changes to the running services separately; local edits do not update deployed services.
