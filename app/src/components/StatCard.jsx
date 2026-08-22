export default function StatCard({ label, value, hint, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={"stat-card-value" + (accent ? ` accent-${accent}` : "")}>{value}</div>
      {hint && <div className="stat-card-hint">{hint}</div>}
    </div>
  );
}
