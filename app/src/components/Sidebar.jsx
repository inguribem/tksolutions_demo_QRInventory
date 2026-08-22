import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import EnvSwitcher from "./EnvSwitcher.jsx";

const links = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/cajas", label: "Cajas", icon: "📦" },
  { to: "/escanear", label: "Escanear QR", icon: "🔍" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">QR</span>
        <div>
          <div className="sidebar-brand-title">Teknowsolutions</div>
          <div className="sidebar-brand-subtitle">Inventario QR</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <EnvSwitcher />
        <button className="link-button" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
