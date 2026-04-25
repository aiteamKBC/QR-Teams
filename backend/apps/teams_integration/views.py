from django.conf import settings
from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .graph_service import GraphServiceError, TeamsGraphMeetingInstaller
from .models import TeamsMeeting, TeamsQrSession, TeamsEventLog


class TeamsWebhookRequestSerializer(serializers.Serializer):
    event_type = serializers.CharField()
    teams_meeting_id = serializers.CharField()
    chat_id = serializers.CharField(required=False, allow_blank=True)
    subject = serializers.CharField(required=False, allow_blank=True)
    participant_name = serializers.CharField(required=False, allow_blank=True)
    participant_email = serializers.EmailField(required=False, allow_blank=True)
    minutes_valid = serializers.IntegerField(required=False, min_value=1, default=15)


class HealthResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    message = serializers.CharField()


class TeamsWebhookResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    meeting_id = serializers.IntegerField(required=False)
    teams_meeting_id = serializers.CharField()
    chat_id = serializers.CharField(required=False, allow_blank=True)
    subject = serializers.CharField(required=False, allow_null=True)
    qr_token = serializers.CharField(required=False)
    qr_url = serializers.CharField(required=False)
    expires_at = serializers.CharField(required=False)
    event_type = serializers.CharField(required=False)
    auto_install = serializers.JSONField(required=False)


class TeamsQrDetailResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    teams_meeting_id = serializers.CharField()
    subject = serializers.CharField(allow_null=True)
    qr_token = serializers.CharField(required=False)
    valid_from = serializers.CharField(required=False)
    expires_at = serializers.CharField()


class TeamsEventLogSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    event_type = serializers.CharField()
    teams_meeting_id = serializers.CharField()
    participant_name = serializers.CharField(allow_null=True)
    participant_email = serializers.EmailField(allow_null=True)
    payload = serializers.JSONField()
    created_at = serializers.CharField()


class ActiveQrResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    teams_meeting_id = serializers.CharField()
    subject = serializers.CharField(allow_null=True, required=False)
    qr_token = serializers.CharField(required=False)
    qr_url = serializers.CharField(required=False)
    valid_from = serializers.CharField(required=False)
    expires_at = serializers.CharField(required=False)
    is_active = serializers.BooleanField(required=False)


def _get_or_create_meeting(
    teams_meeting_id: str,
    *,
    subject: str | None = None,
    chat_id: str | None = None,
):
    meeting, created = TeamsMeeting.objects.get_or_create(
        teams_meeting_id=teams_meeting_id,
        defaults={
            "subject": subject or teams_meeting_id,
            "chat_id": chat_id or None,
        },
    )
    updated_fields: list[str] = []
    if subject and meeting.subject != subject:
        meeting.subject = subject
        updated_fields.append("subject")
    if chat_id and meeting.chat_id != chat_id:
        meeting.chat_id = chat_id
        updated_fields.append("chat_id")
    if updated_fields:
        meeting.save(update_fields=updated_fields)
    return meeting


def _maybe_auto_install_for_meeting(
    meeting: TeamsMeeting,
    *,
    chat_id: str | None = None,
):
    if not getattr(settings, "TEAMS_AUTO_INSTALL_ON_WEBHOOK", False):
        return {
            "status": "disabled",
            "reason": "Set TEAMS_AUTO_INSTALL_ON_WEBHOOK=true to enable automatic meeting app install.",
        }

    installer = TeamsGraphMeetingInstaller()
    try:
        result = installer.ensure_installed(
            chat_id=chat_id or meeting.chat_id,
            online_meeting_id=meeting.teams_meeting_id,
        )
        return result
    except (GraphServiceError, NotImplementedError) as exc:
        return {
            "status": "failed",
            "reason": str(exc),
        }


def _get_or_create_active_qr(meeting: TeamsMeeting, minutes_valid: int = 15):
    now = timezone.now()

    active_qr = (
        meeting.qr_sessions
        .filter(is_active=True, expires_at__gt=now)
        .order_by("-created_at")
        .first()
    )

    if active_qr:
        return active_qr

    meeting.qr_sessions.filter(is_active=True).update(is_active=False)

    qr = TeamsQrSession.objects.create(
        meeting=meeting,
        valid_from=now,
        expires_at=now + timedelta(minutes=minutes_valid),
        is_active=True,
    )
    return qr


@extend_schema(
    methods=["GET"],
    summary="Health check for Teams bot endpoint",
    responses=HealthResponseSerializer,
)
@extend_schema(
    methods=["POST"],
    summary="Receive Teams bot event and create/update QR session",
    request=TeamsWebhookRequestSerializer,
    responses=TeamsWebhookResponseSerializer,
)
@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def teams_bot_webhook(request):
    if request.method == "GET":
        return Response({
            "status": "ok",
            "message": "Teams bot endpoint is live",
        })

    body = request.data if isinstance(request.data, dict) else {}

    event_type = body.get("event_type")
    teams_meeting_id = body.get("teams_meeting_id")
    chat_id = (body.get("chat_id") or "").strip()
    subject = body.get("subject")
    participant_name = body.get("participant_name")
    participant_email = body.get("participant_email")

    try:
        minutes_valid = int(body.get("minutes_valid", 15))
    except (TypeError, ValueError):
        return Response(
            {"detail": "minutes_valid must be an integer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not event_type or not teams_meeting_id:
        return Response(
            {"detail": "event_type and teams_meeting_id are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    TeamsEventLog.objects.create(
        event_type=event_type,
        teams_meeting_id=teams_meeting_id,
        participant_name=participant_name,
        participant_email=participant_email,
        payload=body,
    )

    meeting = _get_or_create_meeting(
        teams_meeting_id,
        subject=subject,
        chat_id=chat_id or None,
    )

    if event_type in ["meeting_started", "participant_joined"]:
        qr = _get_or_create_active_qr(meeting, minutes_valid=minutes_valid)
        auto_install_result = _maybe_auto_install_for_meeting(
            meeting,
            chat_id=chat_id or None,
        )

        return Response({
            "status": event_type,
            "meeting_id": meeting.id,
            "teams_meeting_id": meeting.teams_meeting_id,
            "chat_id": meeting.chat_id or "",
            "subject": meeting.subject,
            "qr_token": qr.public_token,
            "qr_url": request.build_absolute_uri(f"/api/teams/qr/{qr.public_token}/"),
            "expires_at": qr.expires_at.isoformat(),
            "auto_install": auto_install_result,
        })

    if event_type == "meeting_ended":
        meeting.qr_sessions.filter(is_active=True).update(is_active=False)
        return Response({
            "status": "meeting_closed",
            "teams_meeting_id": teams_meeting_id,
        })

    return Response({
        "status": "logged",
        "event_type": event_type,
        "teams_meeting_id": teams_meeting_id,
    })


@extend_schema(
    summary="Get QR token details",
    responses=TeamsQrDetailResponseSerializer,
)
@api_view(["GET"])
@permission_classes([AllowAny])
def qr_detail(request, token):
    now = timezone.now()

    qr = TeamsQrSession.objects.filter(public_token=token).select_related("meeting").first()
    if not qr:
        return Response({"detail": "QR token not found"}, status=status.HTTP_404_NOT_FOUND)

    if not qr.is_active or qr.expires_at <= now:
        return Response({
            "status": "expired",
            "teams_meeting_id": qr.meeting.teams_meeting_id,
            "subject": qr.meeting.subject,
            "expires_at": qr.expires_at.isoformat(),
        }, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "status": "valid",
        "teams_meeting_id": qr.meeting.teams_meeting_id,
        "subject": qr.meeting.subject,
        "qr_token": qr.public_token,
        "valid_from": qr.valid_from.isoformat(),
        "expires_at": qr.expires_at.isoformat(),
    })


@extend_schema(
    summary="List recent Teams webhook events",
    responses=TeamsEventLogSerializer(many=True),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def list_teams_events(request):
    rows = TeamsEventLog.objects.all().order_by("-created_at")[:200]
    data = [
        {
            "id": row.id,
            "event_type": row.event_type,
            "teams_meeting_id": row.teams_meeting_id,
            "participant_name": row.participant_name,
            "participant_email": row.participant_email,
            "payload": row.payload,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]
    return Response(data)


@extend_schema(
    summary="Get active QR for a Teams meeting",
    parameters=[
        OpenApiParameter(
            name="teams_meeting_id",
            description="Teams meeting id",
            required=True,
            type=str,
            location=OpenApiParameter.PATH,
        )
    ],
    responses=ActiveQrResponseSerializer,
)
@api_view(["GET"])
@permission_classes([AllowAny])
def active_qr_by_meeting(request, teams_meeting_id):
    now = timezone.now()

    meeting = TeamsMeeting.objects.filter(
        teams_meeting_id=teams_meeting_id
    ).prefetch_related("qr_sessions").first()

    if not meeting:
        return Response(
            {
                "status": "inactive",
                "teams_meeting_id": teams_meeting_id,
                "is_active": False,
            },
            status=status.HTTP_200_OK,
        )

    qr = (
        meeting.qr_sessions
        .filter(is_active=True, expires_at__gt=now)
        .order_by("-created_at")
        .first()
    )

    if not qr:
        return Response(
            {
                "status": "inactive",
                "teams_meeting_id": meeting.teams_meeting_id,
                "subject": meeting.subject,
                "is_active": False,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {
            "status": "active",
            "teams_meeting_id": meeting.teams_meeting_id,
            "subject": meeting.subject,
            "qr_token": qr.public_token,
            "qr_url": request.build_absolute_uri(f"/api/teams/qr/{qr.public_token}/"),
            "valid_from": qr.valid_from.isoformat(),
            "expires_at": qr.expires_at.isoformat(),
            "is_active": True,
        },
        status=status.HTTP_200_OK,
    )
