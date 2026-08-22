import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import EnvSwitcher from "../components/EnvSwitcher.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="login-shell">
      <div className="card login-card">
        <div className="sidebar-brand" style={{ borderBottom: "none", marginBottom: 8 }}>
          <span className="sidebar-brand-mark">QR</span>
          <div>
            <div className="sidebar-brand-title" style={{ color: "var(--text)" }}>
              Teknowsolutions
            </div>
            <div className="sidebar-brand-subtitle" style={{ color: "var(--text-muted)" }}>
              Inventario QR
            </div>
          </div>
        </div>

        <div className="login-env-row">
          <EnvSwitcher />
        </div>

        {sent ? (
          <p>
            Revisa tu correo (<strong>{email}</strong>) y hacé clic en el enlace mágico para
            entrar.
          </p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            {error && <div className="error-banner">{error}</div>}
            <label>
              Correo
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </label>
            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace mágico"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
