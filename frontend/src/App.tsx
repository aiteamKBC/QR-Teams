import { Navigate, Route, Routes } from "react-router-dom";
import TeamsQrPanel from "./pages/TeamsQrPanel";
import TeamsConfig from "./pages/TeamsConfig";

export default function App() {
  return (
    <Routes>
      <Route path="/teams/qr-panel" element={<TeamsQrPanel />} />
      <Route path="/teams/config" element={<TeamsConfig />} />
      <Route path="/" element={<Navigate to="/teams/qr-panel" replace />} />
      <Route path="*" element={<Navigate to="/teams/qr-panel" replace />} />
    </Routes>
  );
}
