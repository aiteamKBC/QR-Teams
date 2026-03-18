## Teams Manifest Setup (Current Temporary Test Session)

Current frontend ngrok URL:

- `https://gastroenteritic-semisolemnly-kelly.ngrok-free.dev`

`manifest.json` is currently configured to use only this frontend domain:

- `contentUrl`: `https://gastroenteritic-semisolemnly-kelly.ngrok-free.dev/teams/qr-panel`
- `websiteUrl`: `https://gastroenteritic-semisolemnly-kelly.ngrok-free.dev/teams/qr-panel`
- `validDomains`: `["gastroenteritic-semisolemnly-kelly.ngrok-free.dev"]`
- `configurableTabs`: removed
- `staticTabs`: includes meeting contexts (`meetingSidePanel`, `meetingChatTab`, `meetingDetailsTab`)
- `activities.activityTypes`: includes `attendanceReady` for activity feed notification template

## Real Teams Meeting Test Flow (Single ngrok)

1. Start backend on port `8000`:

```bash
cd backend
python manage.py runserver 8000
```

2. Start frontend on port `5173` and host `0.0.0.0`:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

3. Start ngrok for frontend only:

```bash
ngrok http 5173
```

4. If ngrok domain changed, update `manifest.json` URLs and `validDomains` to the new frontend domain.
5. Re-zip Teams package files:
   - `manifest.json`
   - `color.png`
   - `outline.png`
6. Re-upload the custom app package in Microsoft Teams.
7. Add/open the app tab in a real Teams meeting (no config/save step for new static pins).
8. If you move to production domain, replace all ngrok URLs and `validDomains` then re-upload.

## Production manifest template

- `manifest.production.template.json` is included for real-domain cutover and Graph notification permissions.
- Replace placeholders, save as `manifest.json`, then package with icons for production upload.
