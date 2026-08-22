import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Boxes from "./pages/Boxes.jsx";
import BoxDetail from "./pages/BoxDetail.jsx";
import Scan from "./pages/Scan.jsx";
import { useSession } from "./lib/useSession.js";

export default function App() {
  const session = useSession();

  if (session === undefined) {
    return <p className="empty-state">Cargando...</p>;
  }

  if (session === null) {
    return <Login />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cajas" element={<Boxes />} />
          <Route path="/cajas/:id" element={<BoxDetail />} />
          <Route path="/escanear" element={<Scan />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
