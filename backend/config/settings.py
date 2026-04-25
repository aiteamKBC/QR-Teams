import os
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_local_env():
    env_file = BASE_DIR / ".env"
    if not env_file.exists():
        return

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


def _db_from_url(database_url: str):
    parsed = urlparse(database_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ValueError("DATABASE_URL must use postgres/postgresql scheme")

    query = parse_qs(parsed.query)
    options = {}
    for option_key in ("sslmode", "channel_binding"):
        if option_key in query and query[option_key]:
            options[option_key] = query[option_key][0]

    config = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/"),
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or 5432),
    }
    if options:
        config["OPTIONS"] = options
    return config


_load_local_env()


def _optional_env(name: str) -> str:
    return os.getenv(name, "").strip()


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


SECRET_KEY = _optional_env("DJANGO_SECRET_KEY") or "dev-secret-key-change-me"
DEBUG = _bool_env("DJANGO_DEBUG", True)

NGROK_BACKEND_HOST = _optional_env("NGROK_BACKEND_HOST")
PUBLIC_FRONTEND_ORIGIN = _optional_env("PUBLIC_FRONTEND_ORIGIN") or _optional_env(
    "NGROK_FRONTEND_ORIGIN"
)
MS_GRAPH_TENANT_ID = _optional_env("MS_GRAPH_TENANT_ID")
MS_GRAPH_CLIENT_ID = _optional_env("MS_GRAPH_CLIENT_ID")
MS_GRAPH_CLIENT_SECRET = _optional_env("MS_GRAPH_CLIENT_SECRET")
TEAMS_APP_CATALOG_ID = _optional_env("TEAMS_APP_CATALOG_ID")
MS_GRAPH_BASE_URL = _optional_env("MS_GRAPH_BASE_URL") or "https://graph.microsoft.com/v1.0"
# Optional for local debugging only; don't use long-lived hardcoded tokens in production.
MS_GRAPH_ACCESS_TOKEN_OVERRIDE = _optional_env("MS_GRAPH_ACCESS_TOKEN_OVERRIDE")
TEAMS_MANIFEST_APP_ID = _optional_env("TEAMS_MANIFEST_APP_ID")
TEAMS_QR_TAB_ENTITY_ID = _optional_env("TEAMS_QR_TAB_ENTITY_ID") or "qr-panel-static"
TEAMS_QR_PANEL_PUBLIC_URL = _optional_env("TEAMS_QR_PANEL_PUBLIC_URL")
TEAMS_ACTIVITY_TYPE = _optional_env("TEAMS_ACTIVITY_TYPE") or "attendanceReady"
TEAMS_AUTO_INSTALL_ON_WEBHOOK = _bool_env("TEAMS_AUTO_INSTALL_ON_WEBHOOK", False)

ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
]
if NGROK_BACKEND_HOST:
    ALLOWED_HOSTS.append(NGROK_BACKEND_HOST)
extra_allowed_hosts = _optional_env("DJANGO_ALLOWED_HOSTS")
if extra_allowed_hosts:
    ALLOWED_HOSTS.extend(
        [host.strip() for host in extra_allowed_hosts.split(",") if host.strip()]
    )

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "apps.teams_integration",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL:
    DATABASES = {"default": _db_from_url(DATABASE_URL)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]
if PUBLIC_FRONTEND_ORIGIN:
    CORS_ALLOWED_ORIGINS.append(PUBLIC_FRONTEND_ORIGIN)

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]
if PUBLIC_FRONTEND_ORIGIN:
    CSRF_TRUSTED_ORIGINS.append(PUBLIC_FRONTEND_ORIGIN)

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "QR Teams API",
    "DESCRIPTION": "Minimal backend APIs for Teams QR attendance integration.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
