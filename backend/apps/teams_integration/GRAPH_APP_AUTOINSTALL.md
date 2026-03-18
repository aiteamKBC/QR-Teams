# Teams Meeting App Auto-Install (Graph Scaffold)

This project now includes scaffold services for:

- Installing the Teams app into a meeting chat using Microsoft Graph.
- Sending activity feed notifications that deep-link into the QR app experience.

## Why this exists

- Avoid manual per-meeting add/config friction.
- Prepare for backend-driven installation flow.
- Keep current behavior stable until credentials and permissions are ready.

## Added scaffold

- Service: `apps.teams_integration.graph_service.TeamsGraphMeetingInstaller`
- Command: `python manage.py install_teams_app_to_chat --chat-id "<CHAT_ID>"`
- Service: `apps.teams_integration.graph_notification_service.TeamsGraphNotificationService`
- Command: `python manage.py send_teams_qr_notification --chat-id "<CHAT_ID>"`

## Target Graph API

- Install app to chat:
  - `POST /chats/{chat-id}/installedApps`
  - Body includes:
    - `"teamsApp@odata.bind": "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps/{TEAMS_APP_CATALOG_ID}"`
- Send activity notification to chat/user:
  - `POST /chats/{chat-id}/sendActivityNotification`
  - Payload includes `topic.webUrl` deep link to the QR app tab.

If the chat is linked to an online meeting, app installation applies to that meeting context.

## Required real values (TODO)

- `MS_GRAPH_TENANT_ID`
- `MS_GRAPH_CLIENT_ID`
- `MS_GRAPH_CLIENT_SECRET`
- `TEAMS_APP_CATALOG_ID` (the Teams app ID in app catalog)
- `TEAMS_MANIFEST_APP_ID` (manifest `id`, used for Teams deep link)
- `TEAMS_QR_TAB_ENTITY_ID` (currently `qr-panel-static`)
- `TEAMS_QR_PANEL_PUBLIC_URL` (for `webUrl` deep link fallback)

## Required permissions (admin consent required)

Minimum depends on tenant policy and app permission model. Review Graph docs for chat app installation. Typical permissions include:

- `TeamsAppInstallation.ReadWriteSelfForChat.All` (application)
- or broader chat/manage permissions if needed by your scenario.
- Plus activity notification permissions as required by your chosen Graph notification path.

## Important implementation TODOs

1. Implement `resolve_meeting_chat_id(...)` in `graph_service.py`.
   - Option A: store `chat_id` when processing Teams meeting events.
   - Option B: resolve through Graph based on meeting metadata in your tenant flow.
2. Decide when to trigger install:
   - on meeting creation event
   - on first known meeting webhook event
   - scheduled reconciliation job
3. Add retries/idempotency and audit logging around install attempts.
4. Add recipient resolution for attendance notifications:
   - meeting participants -> Microsoft Entra user IDs.

## Notes

- This scaffold does not force unsupported popup-on-join behavior.
- It only prepares server-side app installation for meeting chat context.
