import json
from dataclasses import dataclass
from urllib import error, parse, request

from django.conf import settings

from .graph_service import GraphServiceError, TeamsGraphMeetingInstaller


@dataclass(frozen=True)
class TeamsNotificationConfig:
    graph_base_url: str
    teams_manifest_app_id: str
    teams_qr_tab_entity_id: str
    teams_qr_web_url: str
    teams_activity_type: str

    @classmethod
    def from_settings(cls) -> "TeamsNotificationConfig":
        frontend_origin = (
            getattr(settings, "PUBLIC_FRONTEND_ORIGIN", "").strip()
            or "https://example.com"
        )
        return cls(
            graph_base_url=(
                getattr(settings, "MS_GRAPH_BASE_URL", "").strip()
                or "https://graph.microsoft.com/v1.0"
            ),
            teams_manifest_app_id=(
                getattr(settings, "TEAMS_MANIFEST_APP_ID", "").strip()
            ),
            teams_qr_tab_entity_id=(
                getattr(settings, "TEAMS_QR_TAB_ENTITY_ID", "").strip()
                or "qr-panel-static"
            ),
            teams_qr_web_url=(
                getattr(settings, "TEAMS_QR_PANEL_PUBLIC_URL", "").strip()
                or f"{frontend_origin.rstrip('/')}/teams/qr-panel"
            ),
            teams_activity_type=(
                getattr(settings, "TEAMS_ACTIVITY_TYPE", "").strip()
                or "attendanceReady"
            ),
        )


class TeamsGraphNotificationService:
    """
    Scaffold service for Teams activity feed notifications + deep link flow.

    Supported target flow:
    - User sees Teams activity notification (no forced popup).
    - User clicks notification.
    - Teams opens app deep link targeting QR tab experience.

    TODO:
    - Add tenant-specific recipient resolution (meeting participants -> AAD user IDs).
    - Ensure manifest includes webApplicationInfo/authorization as required for production.
    - Ensure app is installed in recipient scope (chat/team/personal) before notifying.
    """

    def __init__(
        self,
        *,
        installer: TeamsGraphMeetingInstaller | None = None,
        config: TeamsNotificationConfig | None = None,
    ):
        self.installer = installer or TeamsGraphMeetingInstaller()
        self.config = config or TeamsNotificationConfig.from_settings()

    def build_qr_deep_link(self, *, tenant_id: str | None = None) -> str:
        """
        Build Teams deep link to QR app tab.
        """
        if not self.config.teams_manifest_app_id:
            raise GraphServiceError("Missing TEAMS_MANIFEST_APP_ID setting")

        params = {
            "webUrl": self.config.teams_qr_web_url,
            "label": "Attendance QR",
        }
        if tenant_id:
            params["tenantId"] = tenant_id

        query = parse.urlencode(params)
        return (
            "https://teams.microsoft.com/l/entity/"
            f"{self.config.teams_manifest_app_id}/"
            f"{self.config.teams_qr_tab_entity_id}?{query}"
        )

    def compose_chat_activity_payload(
        self,
        *,
        chat_id: str,
        recipient_user_id: str | None = None,
        preview_text: str = "Attendance QR is ready",
        tenant_id: str | None = None,
    ) -> dict:
        deep_link = self.build_qr_deep_link(tenant_id=tenant_id)

        if recipient_user_id:
            recipient = {
                "@odata.type": "#microsoft.graph.aadUserNotificationRecipient",
                "userId": recipient_user_id,
            }
        else:
            recipient = {
                "@odata.type": "#microsoft.graph.chatMembersNotificationRecipient",
                "chatId": chat_id,
            }

        return {
            "topic": {
                "source": "text",
                "value": "Attendance QR",
                "webUrl": deep_link,
            },
            "activityType": self.config.teams_activity_type,
            "previewText": {"content": preview_text},
            "recipient": recipient,
            # For the current templateText we don't need extra parameters.
            "templateParameters": [],
        }

    def send_chat_activity_notification(
        self,
        *,
        chat_id: str,
        recipient_user_id: str | None = None,
        preview_text: str = "Attendance QR is ready",
        tenant_id: str | None = None,
    ) -> dict:
        if not chat_id:
            raise GraphServiceError("chat_id is required")

        token = self.installer.get_access_token()
        endpoint = (
            f"{self.config.graph_base_url}/chats/"
            f"{parse.quote(chat_id, safe=':@.-_')}/sendActivityNotification"
        )
        payload = self.compose_chat_activity_payload(
            chat_id=chat_id,
            recipient_user_id=recipient_user_id,
            preview_text=preview_text,
            tenant_id=tenant_id,
        )
        raw = json.dumps(payload).encode("utf-8")

        req = request.Request(endpoint, data=raw, method="POST")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")

        try:
            with request.urlopen(req, timeout=30) as res:
                return {
                    "status": "sent",
                    "http_status": res.status,
                    "chat_id": chat_id,
                    "recipient_user_id": recipient_user_id,
                    "deep_link": payload["topic"]["webUrl"],
                    "activity_type": payload["activityType"],
                }
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            raise GraphServiceError(
                f"Send activity notification failed ({exc.code}): {details}"
            ) from exc
        except Exception as exc:  # pragma: no cover - defensive
            raise GraphServiceError(
                f"Send activity notification failed: {exc}"
            ) from exc

    def resolve_recipient_user_ids_for_meeting(self, *, teams_meeting_id: str) -> list[str]:
        """
        Placeholder for recipient identity resolution.

        TODO: map meeting participants to Microsoft Entra user IDs.
        This can be implemented from:
        - stored webhook participant events, plus Graph lookup by UPN/email
        - or direct meeting participant Graph APIs, based on tenant permissions
        """
        raise NotImplementedError(
            "Recipient resolution isn't implemented yet. Provide user IDs directly."
        )
