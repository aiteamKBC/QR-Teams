import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { app } from "@microsoft/teams-js";
import { Button } from "@fluentui/react-components";
import { ShareRegular } from "@fluentui/react-icons";

const STUDENT_UI_IMAGE_SRC = "/assets/attendance-student-ui.png";
const ATTENDANCE_URL = "https://attendance.kentbusinesscollege.net/";

type TeamsUserCategory = "member" | "guest" | "anonymous" | "external";
type TeamsHostSurface = "meeting" | "channel" | "team" | "groupChat" | "unknown";
type TeamsContextSnapshot = {
  surface: TeamsHostSurface;
  host: {
    name: string;
    clientType: string;
    locale: string;
    theme: string;
  };
  page: {
    frameContext: string;
    id: string;
    subPageId: string;
  };
  user: {
    id: string;
    displayName: string;
    loginHint: string;
    userPrincipalName: string;
    licenseType: string;
    tenantId: string;
    aadObjectId: string;
  };
  meeting: {
    id: string;
    role: string;
  };
  chat: {
    id: string;
  };
  team: {
    groupId: string;
    displayName: string;
  };
  channel: {
    id: string;
    displayName: string;
    hostTeamGroupId: string;
    hostTenantId: string;
  };
};
type TeamsUserDetection = {
  category: TeamsUserCategory;
  reason: string;
};
type TeamsRenderDecision = {
  allowed: boolean;
  reason: string;
  limitations: string[];
};

const TEAMS_DEBUG_PREFIX = "[KBC Attendance][TeamsQrPanel]";

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const candidate = readString(value);
    if (candidate) {
      return candidate;
    }
  }

  return "";
}

function readPath(source: unknown, ...path: string[]) {
  let current: unknown = source;

  for (const segment of path) {
    const currentObject = readObject(current);
    if (!currentObject) {
      return "";
    }

    current = currentObject[segment];
  }

  return readString(current);
}

function buildTeamsContextSnapshot(context: unknown): TeamsContextSnapshot {
  const pageFrameContext = firstString(readPath(context, "page", "frameContext"));
  const normalizedFrameContext = pageFrameContext.toLowerCase();
  const meetingId = firstString(
    readPath(context, "meeting", "id"),
    readPath(context, "meeting", "meetingId"),
  );
  const chatId = firstString(readPath(context, "chat", "id"));
  const teamGroupId = firstString(
    readPath(context, "team", "groupId"),
    readPath(context, "team", "internalId"),
  );
  const channelId = firstString(readPath(context, "channel", "id"));
  const looksLikeMeetingSurface =
    normalizedFrameContext.includes("meeting") || normalizedFrameContext === "sidepanel";
  const surface = looksLikeMeetingSurface || meetingId
    ? "meeting"
    : normalizedFrameContext === "privatechattab" || chatId
      ? "groupChat"
      : channelId || normalizedFrameContext === "channeltab"
        ? "channel"
        : teamGroupId || normalizedFrameContext === "teamlevelapp"
          ? "team"
          : "unknown";

  return {
    surface,
    host: {
      name: firstString(readPath(context, "app", "host", "name"), "Teams"),
      clientType: firstString(readPath(context, "app", "host", "clientType"), "unknown"),
      locale: firstString(readPath(context, "app", "locale"), navigator.language, "en-US"),
      theme: firstString(readPath(context, "app", "theme"), "default"),
    },
    page: {
      frameContext: firstString(pageFrameContext, "unknown"),
      id: readPath(context, "page", "id"),
      subPageId: readPath(context, "page", "subPageId"),
    },
    user: {
      id: readPath(context, "user", "id"),
      displayName: firstString(
        readPath(context, "user", "displayName"),
        readPath(context, "user", "userPrincipalName"),
      ),
      loginHint: firstString(
        readPath(context, "user", "loginHint"),
        readPath(context, "user", "userPrincipalName"),
        readPath(context, "user", "email"),
      ),
      userPrincipalName: readPath(context, "user", "userPrincipalName"),
      licenseType: readPath(context, "user", "licenseType"),
      tenantId: firstString(
        readPath(context, "user", "tenant", "id"),
        readPath(context, "user", "tid"),
      ),
      aadObjectId: readPath(context, "user", "aadObjectId"),
    },
    meeting: {
      id: meetingId,
      role: firstString(
        readPath(context, "meeting", "role"),
        readPath(context, "meeting", "userMeetingRole"),
      ),
    },
    chat: {
      id: chatId,
    },
    team: {
      groupId: teamGroupId,
      displayName: readPath(context, "team", "displayName"),
    },
    channel: {
      id: channelId,
      displayName: readPath(context, "channel", "displayName"),
      hostTeamGroupId: firstString(
        readPath(context, "hostTeamGroupId"),
        readPath(context, "channel", "hostTeamGroupId"),
      ),
      hostTenantId: firstString(
        readPath(context, "hostTenantId"),
        readPath(context, "channel", "hostTenantId"),
      ),
    },
  };
}

function detectTeamsUserCategory(snapshot: TeamsContextSnapshot): TeamsUserDetection {
  const licenseType = snapshot.user.licenseType.toLowerCase();
  const loginHint = snapshot.user.loginHint.toLowerCase();
  const userPrincipalName = snapshot.user.userPrincipalName.toLowerCase();

  if (
    licenseType === "anonymous" ||
    (!snapshot.user.aadObjectId &&
      !snapshot.user.id &&
      !snapshot.user.loginHint &&
      !snapshot.user.userPrincipalName &&
      snapshot.surface === "meeting")
  ) {
    return {
      category: "anonymous",
      reason:
        "Teams reported an anonymous meeting participant through user.licenseType or blank user identifiers.",
    };
  }

  if (licenseType === "guest" || loginHint.includes("#ext#") || userPrincipalName.includes("#ext#")) {
    return {
      category: "guest",
      reason: "The Teams context includes guest markers in the user identity.",
    };
  }

  if (
    snapshot.channel.hostTenantId &&
    snapshot.user.tenantId &&
    snapshot.channel.hostTenantId !== snapshot.user.tenantId
  ) {
    return {
      category: "external",
      reason: "The current user tenant differs from the host tenant supplied by Teams.",
    };
  }

  return {
    category: "member",
    reason: "No guest, anonymous, or cross-tenant indicators were present in the available Teams context.",
  };
}

function getRenderDecision(
  snapshot: TeamsContextSnapshot,
  userDetection: TeamsUserDetection,
): TeamsRenderDecision {
  const normalizedFrameContext = snapshot.page.frameContext.toLowerCase();
  const looksLikeMeetingSurface =
    normalizedFrameContext.includes("meeting") ||
    normalizedFrameContext === "sidepanel" ||
    normalizedFrameContext === "meetingstage";
  const limitations: string[] = [];

  if (looksLikeMeetingSurface && !snapshot.meeting.id) {
    limitations.push(
      "Teams opened a meeting surface without a meeting identifier, so meeting-specific diagnostics are incomplete.",
    );
  }

  if (
    (snapshot.surface === "channel" || snapshot.surface === "team") &&
    !snapshot.channel.id &&
    !snapshot.team.groupId &&
    !snapshot.channel.hostTeamGroupId
  ) {
    limitations.push(
      "Teams loaded a channel or team surface without channel or team identifiers, so host-surface diagnostics are incomplete.",
    );
  }

  if (snapshot.surface === "unknown") {
    return {
      allowed: true,
      reason:
        "Teams context is incomplete, but the page does not require member-only signals and can render in fallback mode.",
      limitations: [
        "Teams did not provide enough context to classify the session as meeting, team, channel, or group chat.",
      ],
    };
  }

  if (userDetection.category === "anonymous" && snapshot.surface !== "meeting") {
    limitations.push(
      "Anonymous users are only expected in Teams meeting surfaces; this context looks inconsistent.",
    );
  }

  return {
    allowed: true,
    reason: `Rendering is allowed for ${userDetection.category} users on this ${snapshot.surface} surface because the page has no member-only Teams gating.`,
    limitations,
  };
}

export default function TeamsQrPanel() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocumentOverflow;
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function initializeTeams() {
      try {
        await app.initialize();
        const context = await app.getContext();
        if (disposed) {
          return;
        }

        const snapshot = buildTeamsContextSnapshot(context);
        const userDetection = detectTeamsUserCategory(snapshot);
        const renderDecision = getRenderDecision(snapshot, userDetection);

        console.info(`${TEAMS_DEBUG_PREFIX} Teams SDK initialized.`);
        console.info(`${TEAMS_DEBUG_PREFIX} Raw Teams context`, context);
        console.info(`${TEAMS_DEBUG_PREFIX} Normalized Teams context`, snapshot);
        console.info(`${TEAMS_DEBUG_PREFIX} Detected user category`, userDetection);
        console.info(`${TEAMS_DEBUG_PREFIX} Detected host surface`, {
          surface: snapshot.surface,
          frameContext: snapshot.page.frameContext || "(missing)",
        });
        console.info(`${TEAMS_DEBUG_PREFIX} Teams load summary`, {
          supportedContext: renderDecision.allowed,
          userCategory: userDetection.category,
          hostSurface: snapshot.surface,
          limitations: renderDecision.limitations,
          appearsGuestReady:
            userDetection.category === "member" || userDetection.category === "guest",
        });
        console.info(`${TEAMS_DEBUG_PREFIX} Render decision`, renderDecision);

        if (snapshot.channel.hostTeamGroupId || snapshot.channel.hostTenantId) {
          console.info(
            `${TEAMS_DEBUG_PREFIX} Shared/private channel host metadata detected.`,
            {
              hostTeamGroupId: snapshot.channel.hostTeamGroupId || "(missing)",
              hostTenantId: snapshot.channel.hostTenantId || "(missing)",
            },
          );
        }

      } catch (error) {
        console.warn(
          `${TEAMS_DEBUG_PREFIX} Teams SDK initialization failed. Rendering browser-safe fallback.`,
          error,
        );
      }
    }

    void initializeTeams();

    return () => {
      disposed = true;
    };
  }, []);

  const imageSrc = useMemo(
    () => `${STUDENT_UI_IMAGE_SRC}?r=${retryCount}`,
    [retryCount],
  );

  const retryLoad = () => {
    setHasError(false);
    setIsLoaded(false);
    setRetryCount((value) => value + 1);
  };

  const handleShare = async () => {
    if (shareBusy) {
      return;
    }

    setShareBusy(true);
    setShareMessage("");

    try {
      window.open(ATTENDANCE_URL, "_blank", "noopener,noreferrer");
      setShareMessage("Attendance link opened.");
    } catch (error) {
      console.error("Failed to open attendance link", error);
      setShareMessage("Could not open the attendance link.");
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        {!hasError && (
          <>
            <h1 style={styles.title}>
              {isLoaded ? "Scan QR to attend" : "Preparing attendance QR..."}
            </h1>
            {isLoaded && (
              <>
                <p style={styles.subtitle}>Attendance is required for this session</p>
                <p style={styles.helper}>Use your phone camera to scan the code</p>
              </>
            )}
          </>
        )}

        <div style={styles.qrCard}>
          {!hasError ? (
            <>
              {!isLoaded && (
                <div style={styles.loadingWrap}>
                  <div style={styles.loader} aria-hidden />
                </div>
              )}
              <img
                src={imageSrc}
                alt="Attendance QR"
                style={isLoaded ? styles.image : styles.hiddenImage}
                draggable={false}
                onLoad={() => {
                  setIsLoaded(true);
                  setHasError(false);
                }}
                onError={() => {
                  setHasError(true);
                  setIsLoaded(false);
                }}
              />
            </>
          ) : (
            <div style={styles.errorCard}>
              <h2 style={styles.errorTitle}>Could not load attendance QR</h2>
              <button type="button" style={styles.retryButton} onClick={retryLoad}>
                Retry
              </button>
            </div>
          )}
        </div>

        <Button
          appearance="secondary"
          icon={<ShareRegular />}
          size="large"
          shape="rounded"
          style={shareBusy ? styles.shareButtonDisabled : styles.shareButton}
          onClick={handleShare}
          disabled={shareBusy}
        >
          {shareBusy ? "Opening..." : "Open attendance link"}
        </Button>
        <a
          href={ATTENDANCE_URL}
          target="_blank"
          rel="noreferrer"
          style={styles.attendanceLink}
        >
          {ATTENDANCE_URL}
        </a>
        {shareMessage ? <p style={styles.shareMessage}>{shareMessage}</p> : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    position: "fixed",
    inset: 0,
    margin: 0,
    padding: 16,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.18), transparent 44%), radial-gradient(circle at 90% 90%, rgba(59, 130, 246, 0.14), transparent 48%), #0f172a",
    boxSizing: "border-box",
    fontFamily: "Segoe UI, Arial, sans-serif",
  },
  content: {
    width: "100%",
    maxWidth: 520,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  title: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    color: "#dbe4ff",
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.35,
    textAlign: "center",
  },
  helper: {
    margin: 0,
    color: "#9fb0d8",
    fontSize: 13,
    lineHeight: 1.4,
    textAlign: "center",
  },
  qrCard: {
    width: "100%",
    maxWidth: 520,
    aspectRatio: "1 / 1",
    background: "#ffffff",
    borderRadius: 22,
    padding: 18,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 18px 36px rgba(15, 23, 42, 0.55), inset 0 0 0 1px rgba(15, 23, 42, 0.06)",
  },
  image: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "contain",
    userSelect: "none",
    borderRadius: 12,
  },
  hiddenImage: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  loader: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "4px solid #d6def0",
    borderTopColor: "#5b6acb",
  },
  errorCard: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: 18,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    textAlign: "center",
  },
  errorTitle: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#0f172a",
  },
  retryButton: {
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    color: "#ffffff",
    background: "#4f46e5",
  },
  shareButton: {
    minWidth: 168,
    padding: "12px 20px",
    fontWeight: 700,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.18)",
  },
  shareButtonDisabled: {
    minWidth: 168,
    padding: "12px 20px",
    fontWeight: 700,
    opacity: 0.72,
    boxShadow: "none",
  },
  shareMessage: {
    margin: 0,
    minHeight: 20,
    color: "#dbe4ff",
    fontSize: 13,
    lineHeight: 1.4,
    textAlign: "center",
  },
  attendanceLink: {
    color: "#bfdbfe",
    fontSize: 13,
    lineHeight: 1.4,
    textDecoration: "underline",
    wordBreak: "break-all",
    textAlign: "center",
  },
};
