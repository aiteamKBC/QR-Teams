from django.urls import path
from .views import (
    teams_bot_webhook,
    qr_detail,
    list_teams_events,
    active_qr_by_meeting,
)

urlpatterns = [
    path("bot", teams_bot_webhook, name="api_teams_bot"),
    path("qr/<str:token>/", qr_detail, name="api_teams_qr_detail"),
    path("events", list_teams_events, name="api_teams_events"),
    path(
        "meeting/<str:teams_meeting_id>/active-qr",
        active_qr_by_meeting,
        name="api_teams_active_qr_by_meeting",
    ),
]