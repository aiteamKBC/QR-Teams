import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { LinkRegular } from "@fluentui/react-icons";
import { app } from "@microsoft/teams-js";
import { QRCodeSVG } from "qrcode.react";

const STUDENT_UI_IMAGE_SRC = "/assets/attendance-student-ui.png";
const ATTENDANCE_URL = "https://lms.kentbusinesscollege.org/qr-attendance";

export default function TeamsQrPanel() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [frameContext, setFrameContext] = useState("");

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

        setFrameContext(context.page.frameContext?.toLowerCase() ?? "");
      } catch (error) {
        console.warn("[KBC Attendance][TeamsQrPanel] Teams SDK initialization failed.", error);
      }
    }

    void initializeTeams();

    return () => {
      disposed = true;
    };
  }, []);

  const imageSrc = useMemo(() => `${STUDENT_UI_IMAGE_SRC}?r=${retryCount}`, [retryCount]);
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
              <div style={isLoaded ? styles.artwork : styles.hiddenImage}>
                <img
                  src={imageSrc}
                  alt="Kent Business College Attendance"
                  style={styles.image}
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
                <QRCodeSVG
                  value={ATTENDANCE_URL}
                  title="Attendance QR"
                  size={398}
                  marginSize={4}
                  level="M"
                  style={styles.qrOverlay}
                />
              </div>
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
          <div style={styles.linkBlock}>
            <p style={styles.linkTitle}>Open Attendence Link:</p>
            <a href={ATTENDANCE_URL} target="_blank" rel="noreferrer" style={styles.attendanceLink}>
              <LinkRegular />
              <span>{ATTENDANCE_URL}</span>
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
  artwork: {
    position: "relative",
    height: "100%",
    aspectRatio: "711 / 888",
    maxWidth: "100%",
    flexShrink: 0,
  },
  qrOverlay: {
    // Cover the printed QR in the original 711 x 888 artwork.
    position: "absolute",
    left: `${(168 / 711) * 100}%`,
    top: `${(374 / 888) * 100}%`,
    width: `${(398 / 711) * 100}%`,
    height: `${(398 / 888) * 100}%`,
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
  linkBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
    textAlign: "center",
  },
  linkTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.4,
  },
  attendanceLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    color: "#e0e7ff",
    fontSize: 14,
    lineHeight: 1.5,
    textDecoration: "underline",
    wordBreak: "break-all",
    textAlign: "center",
  },
  frameContext: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.4,
    textTransform: "capitalize",
  },
};
