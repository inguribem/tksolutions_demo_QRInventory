import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import StatCard from "../components/StatCard.jsx";

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, guardadas: 0, prestadas: 0 });
  const [recentBoxes, setRecentBoxes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: boxes } = await supabase
        .from("boxes")
        .select("id, box_code, name, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5);

      const { count: total } = await supabase
        .from("boxes")
        .select("id", { count: "exact", head: true });

      const { count: guardadas } = await supabase
        .from("boxes")
        .select("id", { count: "exact", head: true })
        .eq("status", "stored");

      const { count: prestadas } = await supabase
        .from("boxes")
        .select("id", { count: "exact", head: true })
        .eq("status", "borrowed");

      setRecentBoxes(boxes || []);
      setStats({ total: total || 0, guardadas: guardadas || 0, prestadas: prestadas || 0 });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Resumen de tu inventario</p>
        </div>
        <Link to="/cajas" className="btn-primary" style={{ textDecoration: "none" }}>
          Ver todas las cajas
        </Link>
      </div>

      <div className="stat-grid">
        <StatCard label="Cajas totales" value={stats.total} accent="blue" />
        <StatCard label="Guardadas" value={stats.guardadas} accent="green" />
        <StatCard label="Prestadas" value={stats.prestadas} accent="purple" />
      </div>

      <div className="card">
        <h2 className="card-title">Últimas cajas actualizadas</h2>
        {loading ? (
          <p className="empty-state">Cargando...</p>
        ) : recentBoxes.length === 0 ? (
          <p className="empty-state">Todavía no hay cajas registradas.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentBoxes.map((box) => (
                <tr key={box.id}>
                  <td className="mono">
                    <Link to={`/cajas/${box.id}`}>{box.box_code}</Link>
                  </td>
                  <td>{box.name}</td>
                  <td>{box.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
