import { Navigate, Route, Routes } from "react-router-dom";
import TeamsQrPanel from "./pages/TeamsQrPanel";
import TeamsTabConfig from "./pages/TeamsTabConfig";

export default function App() {
  return (
    <Routes>
      <Route path="/teams/qr-panel" element={<TeamsQrPanel />} />
      <Route path="/teams/config" element={<TeamsTabConfig />} />
      <Route path="/" element={<Navigate to="/teams/qr-panel" replace />} />
      <Route path="*" element={<Navigate to="/teams/qr-panel" replace />} />
    </Routes>
  );
}
