import type { CSSProperties } from "react";

const STUDENT_UI_IMAGE_SRC = "/assets/attendance-student-ui.png";

export default function TeamsQrPanel() {
  return (
    <div style={styles.page}>
      <div style={styles.imageWrap}>
        <img
          src={STUDENT_UI_IMAGE_SRC}
          alt="Attendance QR"
          style={styles.image}
          draggable={false}
        />
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: 16,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    background: "#f3f3f3",
    boxSizing: "border-box",
  },
  imageWrap: {
    width: "100%",
    maxWidth: 760,
    display: "flex",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "auto",
    display: "block",
    objectFit: "contain",
  },
};
