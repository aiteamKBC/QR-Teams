## Teams Manifest Setup (Current Temporary Test Session)

Current frontend ngrok URL:

- `https://gastroenteritic-semisolemnly-kelly.ngrok-free.dev`

`manifest.json` is currently configured to use only this frontend domain:

- `validDomains`: `["gastroenteritic-semisolemnly-kelly.ngrok-free.dev"]`
- `staticTabs`: handles meeting surfaces without a Save/config page
- `configurableTabs`: handles `team` channel tabs only
- `context`: includes `meetingSidePanel`, `meetingChatTab`, `meetingDetailsTab`, `meetingStage`
- `manifest.json` can omit meeting-stage `resourceSpecific` permissions if you want the app to install without the extra consent prompt; in that mode, share flow falls back to link/deep-link instead of stage sharing
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
7. Upload the app package in Microsoft Teams, then add it inside the target Team/channel or meeting chat as needed.
8. If you move to production domain, replace all ngrok URLs and `validDomains` then re-upload.

## Production manifest template

- `manifest.production.template.json` is included for real-domain cutover and Graph notification permissions.
- Replace placeholders, save as `manifest.json`, then package with icons for production upload.
