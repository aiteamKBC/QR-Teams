import json

from django.core.management.base import BaseCommand, CommandError

from apps.teams_integration.graph_service import (
    GraphServiceError,
    TeamsGraphMeetingInstaller,
)


class Command(BaseCommand):
    help = "Scaffold helper: install this Teams app into a chat via Microsoft Graph."

    def add_arguments(self, parser):
        parser.add_argument(
            "--chat-id",
            dest="chat_id",
            help="Teams chat id (for meeting chats this is usually 19:...@thread.v2).",
        )
        parser.add_argument(
            "--online-meeting-id",
            dest="online_meeting_id",
            help="Optional meeting id; requires resolve_meeting_chat_id implementation.",
        )

    def handle(self, *args, **options):
        chat_id = (options.get("chat_id") or "").strip() or None
        online_meeting_id = (options.get("online_meeting_id") or "").strip() or None

        installer = TeamsGraphMeetingInstaller()
        try:
            result = installer.ensure_installed(
                chat_id=chat_id, online_meeting_id=online_meeting_id
            )
        except NotImplementedError as exc:
            raise CommandError(str(exc)) from exc
        except GraphServiceError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(json.dumps(result, indent=2))
