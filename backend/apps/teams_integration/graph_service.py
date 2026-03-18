import json
from dataclasses import dataclass
from urllib import error, parse, request

from django.conf import settings


class GraphServiceError(RuntimeError):
    """Raised when Microsoft Graph installation steps fail."""


@dataclass(frozen=True)
class GraphInstallConfig:
    tenant_id: str
    client_id: str
    client_secret: str
    teams_app_id: str
    graph_base_url: str
    access_token_override: str = ""

    @classmethod
    def from_settings(cls) -> "GraphInstallConfig":
        return cls(
            tenant_id=getattr(settings, "MS_GRAPH_TENANT_ID", "").strip(),
            client_id=getattr(settings, "MS_GRAPH_CLIENT_ID", "").strip(),
            client_secret=getattr(settings, "MS_GRAPH_CLIENT_SECRET", "").strip(),
            teams_app_id=getattr(settings, "TEAMS_APP_CATALOG_ID", "").strip(),
            graph_base_url=(
                getattr(settings, "MS_GRAPH_BASE_URL", "").strip()
                or "https://graph.microsoft.com/v1.0"
            ),
            access_token_override=(
                getattr(settings, "MS_GRAPH_ACCESS_TOKEN_OVERRIDE", "").strip()
            ),
        )


class TeamsGraphMeetingInstaller:
    """
    Scaffold for installing this Teams app into meeting chats via Graph.

    TODO before production use:
    - Register Azure AD app (client credentials flow).
    - Add required Graph application permissions + admin consent.
    - Publish/sideload this Teams app to catalog and set TEAMS_APP_CATALOG_ID.
    - Add tenant-specific mapping from meeting identifiers to chat-id.
    """

    def __init__(self, config: GraphInstallConfig | None = None):
        self.config = config or GraphInstallConfig.from_settings()

    def get_access_token(self) -> str:
        """
        Get Graph bearer token.

        Supports token override for local testing.
        """
        if self.config.access_token_override:
            return self.config.access_token_override

        required = {
            "MS_GRAPH_TENANT_ID": self.config.tenant_id,
            "MS_GRAPH_CLIENT_ID": self.config.client_id,
            "MS_GRAPH_CLIENT_SECRET": self.config.client_secret,
        }
        missing = [k for k, v in required.items() if not v]
        if missing:
            raise GraphServiceError(
                "Missing Graph credential settings: " + ", ".join(sorted(missing))
            )

        token_url = (
            f"https://login.microsoftonline.com/{self.config.tenant_id}"
            "/oauth2/v2.0/token"
        )
        body = parse.urlencode(
            {
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "grant_type": "client_credentials",
                "scope": "https://graph.microsoft.com/.default",
            }
        ).encode("utf-8")

        req = request.Request(token_url, data=body, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        try:
            with request.urlopen(req, timeout=30) as res:
                payload = json.loads(res.read().decode("utf-8"))
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            raise GraphServiceError(
                f"Graph token request failed ({exc.code}): {details}"
            ) from exc
        except Exception as exc:  # pragma: no cover - defensive
            raise GraphServiceError(f"Graph token request failed: {exc}") from exc

        token = payload.get("access_token")
        if not token:
            raise GraphServiceError("Graph token response missing access_token")
        return token

    def resolve_meeting_chat_id(self, *, online_meeting_id: str) -> str:
        """
        Resolve a meeting chat-id from a meeting identifier.

        TODO: Implement tenant-specific logic. Common options:
        - Persist meeting chat-id when webhook receives Teams event payload.
        - Resolve by online meeting metadata via Graph if available in your flow.
        """
        raise NotImplementedError(
            "resolve_meeting_chat_id is a scaffold. Implement meeting->chat mapping."
        )

    def install_app_to_chat(self, *, chat_id: str) -> dict:
        """
        POST /chats/{chat-id}/installedApps
        https://learn.microsoft.com/graph/api/chat-post-installedapps
        """
        if not chat_id:
            raise GraphServiceError("chat_id is required")
        if not self.config.teams_app_id:
            raise GraphServiceError("Missing TEAMS_APP_CATALOG_ID setting")

        token = self.get_access_token()
        endpoint = (
            f"{self.config.graph_base_url}/chats/"
            f"{parse.quote(chat_id, safe=':@.-_')}/installedApps"
        )
        body = {
            "teamsApp@odata.bind": (
                f"{self.config.graph_base_url}/appCatalogs/teamsApps/"
                f"{self.config.teams_app_id}"
            )
        }
        raw = json.dumps(body).encode("utf-8")

        req = request.Request(endpoint, data=raw, method="POST")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")

        try:
            with request.urlopen(req, timeout=30) as res:
                return {
                    "status": "installed",
                    "http_status": res.status,
                    "chat_id": chat_id,
                    "teams_app_id": self.config.teams_app_id,
                }
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            if exc.code == 409:
                return {
                    "status": "already_installed",
                    "http_status": exc.code,
                    "chat_id": chat_id,
                    "teams_app_id": self.config.teams_app_id,
                }
            raise GraphServiceError(
                f"Install app to chat failed ({exc.code}): {details}"
            ) from exc
        except Exception as exc:  # pragma: no cover - defensive
            raise GraphServiceError(f"Install app to chat failed: {exc}") from exc

    def ensure_installed(
        self, *, chat_id: str | None = None, online_meeting_id: str | None = None
    ) -> dict:
        """
        Ensure app installation in meeting chat.

        Use either known chat_id, or online_meeting_id + resolver implementation.
        """
        effective_chat_id = chat_id
        if not effective_chat_id and online_meeting_id:
            effective_chat_id = self.resolve_meeting_chat_id(
                online_meeting_id=online_meeting_id
            )

        if not effective_chat_id:
            raise GraphServiceError(
                "Provide chat_id or implement resolve_meeting_chat_id for online_meeting_id"
            )

        return self.install_app_to_chat(chat_id=effective_chat_id)
