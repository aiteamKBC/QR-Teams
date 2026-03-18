import json

from django.core.management.base import BaseCommand, CommandError

from apps.teams_integration.graph_notification_service import (
    TeamsGraphNotificationService,
)
from apps.teams_integration.graph_service import GraphServiceError


class Command(BaseCommand):
    help = "Scaffold helper: send Teams activity notification deep-linking to QR tab."

    def add_arguments(self, parser):
        parser.add_argument(
            "--chat-id",
            required=True,
            dest="chat_id",
            help="Meeting chat id, for example 19:...@thread.v2",
        )
        parser.add_argument(
            "--recipient-user-id",
            dest="recipient_user_id",
            help="Optional AAD user id. Omit to notify all chat members.",
        )
        parser.add_argument(
            "--preview-text",
            dest="preview_text",
            default="Attendance QR is ready",
            help="Notification preview text.",
        )
        parser.add_argument(
            "--tenant-id",
            dest="tenant_id",
            help="Optional tenant id added to deep link query.",
        )

    def handle(self, *args, **options):
        service = TeamsGraphNotificationService()
        try:
            result = service.send_chat_activity_notification(
                chat_id=(options.get("chat_id") or "").strip(),
                recipient_user_id=(options.get("recipient_user_id") or "").strip()
                or None,
                preview_text=(options.get("preview_text") or "").strip()
                or "Attendance QR is ready",
                tenant_id=(options.get("tenant_id") or "").strip() or None,
            )
        except NotImplementedError as exc:
            raise CommandError(str(exc)) from exc
        except GraphServiceError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(json.dumps(result, indent=2))
