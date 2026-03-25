import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { app, FrameContexts, meeting, pages, sharing } from "@microsoft/teams-js";
import { Button } from "@fluentui/react-components";
import { ShareRegular } from "@fluentui/react-icons";

const STUDENT_UI_IMAGE_SRC = "/assets/attendance-student-ui.png";
const APP_BASE_URL =
  import.meta.env.VITE_PUBLIC_APP_BASE_URL?.replace(/\/$/, "") ||
  window.location.origin;
const PANEL_URL = `${APP_BASE_URL}/teams/qr-panel`;
const SHARE_SUBPAGE_ID = "qr-panel-static";

type ShareMode = "stage" | "link" | "copy";

export default function TeamsQrPanel() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [shareMode, setShareMode] = useState<ShareMode>("copy");
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

        const inMeetingSurface =
          context.meeting !== undefined &&
          (context.page.frameContext === FrameContexts.sidePanel ||
            context.page.frameContext === FrameContexts.meetingStage);

        if (inMeetingSurface) {
          meeting.getAppContentStageSharingCapabilities((error, result) => {
            if (disposed) {
              return;
            }

            if (!error && result?.doesAppHaveSharePermission) {
              setShareMode("stage");
              return;
            }

            try {
              setShareMode(sharing.isSupported() ? "link" : "copy");
            } catch {
              setShareMode("copy");
            }
          });
          return;
        }

        setShareMode(sharing.isSupported() ? "link" : "copy");
      } catch {
        setShareMode("copy");
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
      if (shareMode === "stage") {
        await app.initialize();

        await new Promise<void>((resolve, reject) => {
          meeting.shareAppContentToStage((error, result) => {
            if (error || !result) {
              reject(new Error(error?.message || "Could not share panel to stage."));
              return;
            }

            resolve();
          }, PANEL_URL);
        });

        setShareMessage("Panel shared to the meeting stage.");
        return;
      }

      await app.initialize();

      if (shareMode === "link") {
        if (sharing.isSupported()) {
          await sharing.shareWebContent({
            content: [
              {
                type: "URL",
                url: PANEL_URL,
                message: "Open the KBC Attendance panel in Teams.",
                preview: true,
              },
            ],
          });
        } else {
          pages.shareDeepLink({
            subPageId: SHARE_SUBPAGE_ID,
            subPageLabel: "KBC Attendance",
            subPageWebUrl: PANEL_URL,
          });
        }

        setShareMessage("Share dialog opened.");
        return;
      }

      await navigator.clipboard.writeText(PANEL_URL);
      setShareMessage("Panel link copied.");
    } catch (error) {
      console.error("Failed to share panel", error);
      setShareMessage("Could not share the panel.");
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
          {shareBusy
            ? "Sharing..."
            : shareMode === "stage"
              ? "Share to stage"
              : "Share"}
        </Button>
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
};
