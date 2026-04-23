import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { app, meeting } from "@microsoft/teams-js";
import { Button } from "@fluentui/react-components";
import { LinkRegular, ShareRegular } from "@fluentui/react-icons";

const STUDENT_UI_IMAGE_SRC = "/assets/attendance-student-ui.png";
const ATTENDANCE_URL = "https://attendance.kentbusinesscollege.net/";

function getPanelUrl() {
  return new URL("/teams/qr-panel", window.location.origin).toString();
}

function getShareSupportMessage(frameContext: string, hasPermission: boolean) {
  if (!frameContext) {
    return "Open this page inside a Teams meeting to share it to the meeting stage.";
  }

  if (frameContext === "meetingstage") {
    return "This panel is already open on the meeting stage.";
  }

  if (!hasPermission) {
    return "This Teams app package does not currently have meeting stage share permission.";
  }

  return "";
}

function readShareError(error: unknown) {
  if (error && typeof error === "object") {
    const maybeError = error as { message?: string; errorCode?: string | number };
    if (typeof maybeError.message === "string" && maybeError.message.trim()) {
      return maybeError.message.trim();
    }

    if (maybeError.errorCode) {
      return `Teams returned error ${String(maybeError.errorCode)}.`;
    }
  }

  return "Teams could not share this panel to the meeting stage.";
}

function getStageShareCapabilities() {
  return new Promise<boolean>((resolve) => {
    try {
      meeting.getAppContentStageSharingCapabilities((error, capabilities) => {
        if (error) {
          console.warn("[KBC Attendance][TeamsQrPanel] Could not read share capabilities.", error);
          resolve(false);
          return;
        }

        resolve(Boolean(capabilities?.doesAppHaveSharePermission));
      });
    } catch (error) {
      console.warn("[KBC Attendance][TeamsQrPanel] Share capabilities are unavailable.", error);
      resolve(false);
    }
  });
}

function sharePanelToStage(panelUrl: string) {
  return new Promise<void>((resolve, reject) => {
    meeting.shareAppContentToStage(
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Share to stage was not completed."));
          return;
        }

        resolve();
      },
      panelUrl,
      { sharingProtocol: meeting.SharingProtocol.ScreenShare },
    );
  });
}

export default function TeamsQrPanel() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [frameContext, setFrameContext] = useState("");
  const [shareAllowed, setShareAllowed] = useState(false);
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

        const currentFrameContext = context.page.frameContext?.toLowerCase() ?? "";
        setFrameContext(currentFrameContext);

        const canShare =
          currentFrameContext === "sidepanel" ||
          currentFrameContext === "meetingsidepanel" ||
          currentFrameContext === "meetingstage";

        if (!canShare) {
          setShareAllowed(false);
          setShareMessage(getShareSupportMessage(currentFrameContext, false));
          return;
        }

        const hasPermission = await getStageShareCapabilities();
        if (disposed) {
          return;
        }

        setShareAllowed(hasPermission && currentFrameContext !== "meetingstage");
        setShareMessage(getShareSupportMessage(currentFrameContext, hasPermission));
      } catch (error) {
        console.warn("[KBC Attendance][TeamsQrPanel] Teams SDK initialization failed.", error);
        if (!disposed) {
          setShareAllowed(false);
          setShareMessage("Open this page inside a Teams meeting to share it to the meeting stage.");
        }
      }
    }

    void initializeTeams();

    return () => {
      disposed = true;
    };
  }, []);

  const imageSrc = useMemo(() => `${STUDENT_UI_IMAGE_SRC}?r=${retryCount}`, [retryCount]);
  const panelUrl = useMemo(() => getPanelUrl(), []);

  const retryLoad = () => {
    setHasError(false);
    setIsLoaded(false);
    setRetryCount((value) => value + 1);
  };

  const handleShare = async () => {
    if (shareBusy || !shareAllowed) {
      return;
    }

    setShareBusy(true);
    setShareMessage("");

    try {
      await sharePanelToStage(panelUrl);
      setShareMessage("This panel is now being shared to the meeting stage.");
    } catch (error) {
      console.error("[KBC Attendance][TeamsQrPanel] Share to stage failed.", error);
      setShareMessage(readShareError(error));
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <div style={styles.headerBlock}>
          <p style={styles.eyebrow}>QR Teams</p>
          <h1 style={styles.title}>Attendance</h1>
          <p style={styles.subtitle}>Scan the code, open the attendance link, or share this panel to the meeting stage.</p>
        </div>

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

        <div style={styles.infoCard}>
          <p style={styles.sectionLabel}>Attendance link</p>
          <a href={ATTENDANCE_URL} target="_blank" rel="noreferrer" style={styles.attendanceLink}>
            <LinkRegular />
            <span>{ATTENDANCE_URL}</span>
          </a>

          <Button
            appearance="primary"
            icon={<ShareRegular />}
            size="large"
            shape="rounded"
            style={shareAllowed && !shareBusy ? styles.shareButton : styles.shareButtonDisabled}
            onClick={handleShare}
            disabled={!shareAllowed || shareBusy}
          >
            {shareBusy ? "Sharing..." : "Share screen"}
          </Button>

          {shareMessage ? <p style={styles.shareMessage}>{shareMessage}</p> : null}
          {frameContext ? <p style={styles.frameContext}>Teams surface: {frameContext}</p> : null}
        </div>
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
      "radial-gradient(circle at top left, rgba(120, 119, 198, 0.28), transparent 34%), radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.16), transparent 36%), #0f172a",
    boxSizing: "border-box",
    fontFamily: "Segoe UI, Arial, sans-serif",
  },
  content: {
    width: "100%",
    maxWidth: 540,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  headerBlock: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    textAlign: "center",
  },
  eyebrow: {
    margin: 0,
    color: "#c7d2fe",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: 0,
    maxWidth: 460,
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 1.5,
  },
  qrCard: {
    width: "100%",
    maxWidth: 520,
    aspectRatio: "1 / 1",
    background: "#ffffff",
    borderRadius: 24,
    padding: 18,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 24px 50px rgba(15, 23, 42, 0.5)",
    overflow: "hidden",
  },
  loadingWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  loader: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: "4px solid rgba(79, 70, 229, 0.18)",
    borderTopColor: "#4f46e5",
    animation: "spin 1s linear infinite",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    userSelect: "none",
  },
  hiddenImage: {
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
    position: "absolute",
  },
  errorCard: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    background: "#eef2ff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    boxSizing: "border-box",
    textAlign: "center",
  },
  errorTitle: {
    margin: 0,
    color: "#1e293b",
    fontSize: 22,
    fontWeight: 700,
  },
  retryButton: {
    border: "none",
    borderRadius: 999,
    background: "#312e81",
    color: "#fff",
    padding: "12px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  infoCard: {
    width: "100%",
    background: "rgba(15, 23, 42, 0.78)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 20,
    padding: 18,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  sectionLabel: {
    margin: 0,
    color: "#c7d2fe",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  attendanceLink: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#e0e7ff",
    fontSize: 14,
    lineHeight: 1.5,
    textDecoration: "underline",
    wordBreak: "break-all",
  },
  shareButton: {
    width: "100%",
    minHeight: 48,
    background: "linear-gradient(135deg, #4f46e5, #2563eb)",
    color: "#ffffff",
  },
  shareButtonDisabled: {
    width: "100%",
    minHeight: 48,
    background: "rgba(71, 85, 105, 0.42)",
    color: "#cbd5e1",
  },
  shareMessage: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 1.5,
  },
  frameContext: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.4,
    textTransform: "capitalize",
  },
};
