import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { app, pages } from "@microsoft/teams-js";

const APP_BASE_URL =
  import.meta.env.VITE_PUBLIC_APP_BASE_URL?.replace(/\/$/, "") ||
  window.location.origin;

const CONTENT_URL = `${APP_BASE_URL}/teams/qr-panel`;

export default function TeamsTabConfig() {
  const [status, setStatus] = useState("Initializing Teams tab configuration...");
  const [insideTeams, setInsideTeams] = useState(false);

  const configPreview = useMemo(
    () => ({
      entityId: "teams-qr-panel",
      suggestedDisplayName: "QR Attendance Panel",
      contentUrl: CONTENT_URL,
      websiteUrl: CONTENT_URL,
    }),
    [],
  );

  useEffect(() => {
    async function initConfig() {
      try {
        await app.initialize();
        setInsideTeams(true);

        pages.config.registerOnSaveHandler(async (saveEvent) => {
          try {
            await pages.config.setConfig(configPreview);
            saveEvent.notifySuccess();
          } catch (err) {
            console.error("Failed to save Teams tab config", err);
            saveEvent.notifyFailure("Failed to save tab configuration.");
          }
        });

        pages.config.setValidityState(true);
        setStatus("Ready. Click Save in Teams to finish adding this tab.");
      } catch (err) {
        console.warn("Teams config page opened outside Teams", err);
        setStatus(
          "Opened outside Teams. This page is intended for Teams tab configuration.",
        );
      }
    }

    initConfig();
  }, [configPreview]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Teams Tab Configuration</h1>
        <p style={styles.subtitle}>{status}</p>

        <div style={styles.item}>
          <div style={styles.label}>Inside Teams</div>
          <div>{insideTeams ? "Yes" : "No"}</div>
        </div>
        <div style={styles.item}>
          <div style={styles.label}>Public App Base URL</div>
          <div style={styles.breakWord}>{APP_BASE_URL}</div>
        </div>
        <div style={styles.item}>
          <div style={styles.label}>Configured Content URL</div>
          <div style={styles.breakWord}>{CONTENT_URL}</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: 24,
    fontFamily: "Segoe UI, Arial, sans-serif",
  },
  card: {
    maxWidth: 860,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },
  title: {
    marginTop: 0,
    marginBottom: 8,
  },
  subtitle: {
    marginTop: 0,
    marginBottom: 20,
    color: "#555",
  },
  item: {
    background: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  breakWord: {
    wordBreak: "break-all",
  },
};
