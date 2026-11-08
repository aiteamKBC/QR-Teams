# KBC Attendance Teams package

The current `manifest.json` opens this attendance page directly:

`https://lms.kentbusinesscollege.org/qr-attendance`

- App version: `2.0.32`.
- App ID: `5d1360ac-b336-4cd5-8db5-440296b1f366` (unchanged).
- `developer.websiteUrl`, `staticTabs.contentUrl`, and `staticTabs.websiteUrl` use the attendance URL.
- `validDomains` contains `lms.kentbusinesscollege.org`.
- Privacy and terms links retain their existing destinations; no replacement legal pages were supplied.
- The local `/teams/qr-panel` route still displays the QR panel. The Teams package now opens the LMS page instead.

## Build the upload package

Run from the repository root in PowerShell:

```powershell
Compress-Archive -Path frontend/teams-app/manifest/manifest.json,frontend/teams-app/manifest/color.png,frontend/teams-app/manifest/outline.png -DestinationPath frontend/teams-app/manifest/KBC-Attendance-2.0.32.zip -Force
```

The ZIP must contain exactly `manifest.json`, `color.png`, and `outline.png` at its root.

## Apply the update

1. In Teams Admin Center, open `Teams apps > Manage apps > KBC Attendance`.
2. Upload the ZIP as an update to the existing app, keeping the same app ID.
3. Allow the update to propagate, then verify that Teams shows version `2.0.32`.
4. Test the developer website link and open the app in a meeting or chat.
5. If an existing tab retains its saved old URL, reconfigure or remove and re-add that tab after the app update.

Changing `backend/.env` does not update the package installed in Teams. `TEAMS_QR_PANEL_PUBLIC_URL` controls notification web-link fallback and should use the same attendance URL; restart the backend after changing it.

The LMS page is hosted outside this repository. A successful HTTP response alone does not verify Teams compatibility: test its Teams SDK initialization, framing policy, and sign-in behavior inside Teams.

`manifest.production.template.json` is a generic template for a separately hosted QR panel; it is not the current upload manifest.
