import { useEffect, useState, type CSSProperties } from "react";
import { app, pages } from "@microsoft/teams-js";

const CONTENT_URL = "https://qrteams.kentbusinesscollege.net/teams/qr-panel";
const DISPLAY_NAME = "KBC Attendance";
const TAB_CONFIG = {
  entityId: "qr-panel-static",
  suggestedDisplayName: DISPLAY_NAME,
  contentUrl: CONTENT_URL,
  websiteUrl: CONTENT_URL,
};

export default function TeamsConfig() {
  const [status, setStatus] = useState("Configuring tab...");
  const [showManualSaveHint, setShowManualSaveHint] = useState(false);

  useEffect(() => {
    let disposed = false;

    const initializeConfig = async () => {
      try {
        await app.initialize();
        await app.getContext();

        pages.config.registerOnSaveHandler(async (saveEvent) => {
          try {
            await pages.config.setConfig(TAB_CONFIG);
            saveEvent.notifySuccess();
          } catch (err) {
            console.error(err);
            saveEvent.notifyFailure("Failed");
          }
        });

        pages.config.setValidityState(true);

        await pages.config.setConfig(TAB_CONFIG);
        setStatus("Tab configured.");

        try {
          await app.notifySuccess();
        } catch (notifyError) {
          console.warn("Teams host did not auto-close settings view", notifyError);
          if (!disposed) {
            setShowManualSaveHint(true);
            setStatus("Tab configured. If this screen stays open, click Save once.");
          }
        }
      } catch (err) {
        console.error("Teams SDK initialization failed", err);
        if (!disposed) {
          setStatus("Could not configure the tab automatically.");
          setShowManualSaveHint(true);
        }
      }
    };

    void initializeConfig();

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.spinner} aria-hidden />
        <h1 style={styles.title}>Preparing KBC Attendance</h1>
        <p style={styles.status}>{status}</p>
        {showManualSaveHint ? (
          <p style={styles.hint}>Teams may still require one final Save in channel-tab setup.</p>
        ) : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: 24,
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "Segoe UI, Arial, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 24,
    boxSizing: "border-box",
    textAlign: "center",
  },
  spinner: {
    width: 36,
    height: 36,
    margin: "0 auto 18px",
    borderRadius: "50%",
    border: "3px solid rgba(203, 213, 225, 0.25)",
    borderTopColor: "#8b5cf6",
  },
  title: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#f8fafc",
  },
  status: {
    margin: "10px 0 0",
    fontSize: 14,
    lineHeight: 1.4,
    color: "#cbd5e1",
  },
  hint: {
    margin: "12px 0 0",
    fontSize: 12,
    lineHeight: 1.4,
    color: "#94a3b8",
  },
};
