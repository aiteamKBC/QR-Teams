import { useEffect, type CSSProperties } from "react";
import { app, pages } from "@microsoft/teams-js";

const CONTENT_URL = "https://qrteams.kentbusinesscollege.net/teams/qr-panel";
const DISPLAY_NAME = "KBC Attendance";

export default function TeamsConfig() {
  useEffect(() => {
    const initializeConfig = async () => {
      try {
        await app.initialize();
        await app.getContext();

        pages.config.registerOnSaveHandler(async (saveEvent) => {
          try {
            await pages.config.setConfig({
              entityId: "qr-panel-static",
              suggestedDisplayName: DISPLAY_NAME,
              contentUrl: CONTENT_URL,
              websiteUrl: CONTENT_URL,
            });
            saveEvent.notifySuccess();
          } catch (err) {
            console.error(err);
            saveEvent.notifyFailure("Failed");
          }
        });
        pages.config.setValidityState(true);
      } catch (err) {
        console.error("Teams SDK initialization failed", err);
      }
    };

    void initializeConfig();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Open attendance panel</h1>
        <p style={styles.status}>Select Save to continue</p>
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
};
