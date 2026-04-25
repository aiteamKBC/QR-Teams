import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { app, meeting } from "@microsoft/teams-js";
import { LinkRegular } from "@fluentui/react-icons";

const STUDENT_UI_IMAGE_SRC = "/assets/attendance-student-ui.png";
const ATTENDANCE_URL = "https://attendance.kentbusinesscollege.net/";

function getPanelUrl() {
  return new URL("/teams/qr-panel", window.location.origin).toString();
}

function getShareSupportMessage(frameContext: string, hasPermission: boolean, isStageShared: boolean) {
  if (!frameContext) {
    return "Open this page inside a Teams meeting to use the native Teams Share button.";
  }

  if (frameContext === "meetingstage") {
    return "Attendance is already open on the meeting stage.";
  }

  if (isStageShared) {
    return "Attendance is already being shared to the meeting stage.";
  }

  if (!hasPermission) {
    return "The Teams Share button appears for eligible meeting roles when meeting stage sharing is available.";
  }

  return "Use the native Teams Share button below this panel to present Attendance on the meeting stage.";
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

function getStageSharingState() {
  return new Promise<boolean>((resolve) => {
    try {
      meeting.getAppContentStageSharingState((error, state) => {
        if (error) {
          console.warn("[KBC Attendance][TeamsQrPanel] Could not read stage sharing state.", error);
          resolve(false);
          return;
        }

        resolve(Boolean(state?.isAppSharing));
      });
    } catch (error) {
      console.warn("[KBC Attendance][TeamsQrPanel] Stage sharing state is unavailable.", error);
      resolve(false);
    }
  });
}

export default function TeamsQrPanel() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [frameContext, setFrameContext] = useState("");
  const [isStageShared, setIsStageShared] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [shareReady, setShareReady] = useState(false);

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
          currentFrameContext === "meetingsidepanel";

        if (currentFrameContext === "meetingstage") {
          setIsStageShared(true);
          setShareReady(false);
          setShareMessage(getShareSupportMessage(currentFrameContext, true, true));
          return;
        }

        if (!canShare) {
          setShareReady(false);
          setIsStageShared(false);
          setShareMessage(getShareSupportMessage(currentFrameContext, false, false));
          return;
        }

        const [hasPermission, sharingState] = await Promise.all([
          getStageShareCapabilities(),
          getStageSharingState(),
        ]);
        if (disposed) {
          return;
        }

        setShareReady(hasPermission);
        setIsStageShared(sharingState);
        setShareMessage(getShareSupportMessage(currentFrameContext, hasPermission, sharingState));
      } catch (error) {
        console.warn("[KBC Attendance][TeamsQrPanel] Teams SDK initialization failed.", error);
        if (!disposed) {
          setShareReady(false);
          setIsStageShared(false);
          setShareMessage("Open this page inside a Teams meeting to use the native Teams Share button.");
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

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <div style={styles.headerBlock}>
          <p style={styles.eyebrow}>QR Teams</p>
          <h1 style={styles.title}>Attendance</h1>
          <p style={styles.subtitle}>Scan the code, open the attendance link, and use the native Teams Share control when you want this panel on stage.</p>
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
          <div style={shareReady ? styles.shareHintCard : styles.shareHintCardMuted}>
            <p style={styles.shareHintLabel}>Meeting stage</p>
            <p style={styles.shareHintTitle}>
              {isStageShared ? "Already shared in this meeting" : "Share from the Teams meeting controls"}
            </p>
            <p style={styles.shareHintBody}>{shareMessage}</p>
          </div>

          <p style={styles.sectionLabel}>Attendance link</p>
          <a href={ATTENDANCE_URL} target="_blank" rel="noreferrer" style={styles.attendanceLink}>
            <LinkRegular />
            <span>{ATTENDANCE_URL}</span>
          </a>
          <div style={styles.metaRow}>
            <p style={styles.panelUrlLabel}>Panel URL</p>
            <a href={panelUrl} target="_blank" rel="noreferrer" style={styles.panelUrlLink}>
              {panelUrl}
            </a>
          </div>
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
  shareHintCard: {
    borderRadius: 18,
    padding: 16,
    background: "linear-gradient(135deg, rgba(79, 70, 229, 0.22), rgba(37, 99, 235, 0.18))",
    border: "1px solid rgba(129, 140, 248, 0.38)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  shareHintCardMuted: {
    borderRadius: 18,
    padding: 16,
    background: "rgba(30, 41, 59, 0.72)",
    border: "1px solid rgba(100, 116, 139, 0.28)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  shareHintLabel: {
    margin: 0,
    color: "#c7d2fe",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  shareHintTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  shareHintBody: {
    margin: 0,
    color: "#dbeafe",
    fontSize: 13,
    lineHeight: 1.55,
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
  metaRow: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  panelUrlLabel: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  panelUrlLink: {
    color: "#bfdbfe",
    fontSize: 12,
    lineHeight: 1.5,
    textDecoration: "underline",
    wordBreak: "break-all",
  },
  frameContext: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.4,
    textTransform: "capitalize",
  },
};
