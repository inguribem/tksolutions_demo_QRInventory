const STATUS_LABELS = {
  stored: "Guardada",
  partially_empty: "Parcialmente vacía",
  borrowed: "Prestada",
  needs_organization: "Necesita orden",
  empty: "Vacía",
  archived: "Archivada",
};

const STATUS_CLASS = {
  stored: "confirmed",
  partially_empty: "pending_payment",
  borrowed: "hold",
  needs_organization: "expired",
  empty: "cancelled",
  archived: "cancelled",
};

export default function Badge({ status }) {
  const label = STATUS_LABELS[status] || status;
  const cls = STATUS_CLASS[status] || "cancelled";
  return <span className={`badge badge-${cls}`}>{label}</span>;
}
