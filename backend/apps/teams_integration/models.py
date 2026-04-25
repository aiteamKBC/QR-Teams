from django.db import models
from django.utils import timezone
import uuid


class TeamsMeeting(models.Model):
    teams_meeting_id = models.CharField(max_length=255, unique=True)
    chat_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    subject = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.subject or self.teams_meeting_id


class TeamsQrSession(models.Model):
    meeting = models.ForeignKey(
        TeamsMeeting,
        on_delete=models.CASCADE,
        related_name="qr_sessions"
    )
    public_token = models.CharField(max_length=255, unique=True, default=uuid.uuid4)
    valid_from = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.meeting.teams_meeting_id} - {self.public_token}"


class TeamsEventLog(models.Model):
    event_type = models.CharField(max_length=100)
    teams_meeting_id = models.CharField(max_length=255)
    participant_name = models.CharField(max_length=255, blank=True, null=True)
    participant_email = models.EmailField(blank=True, null=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} - {self.teams_meeting_id}"
