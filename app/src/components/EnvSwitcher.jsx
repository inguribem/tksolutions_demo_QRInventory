import { ENVIRONMENTS, getActiveEnv, setActiveEnv } from "../lib/supabaseClient.js";

export default function EnvSwitcher() {
  const active = getActiveEnv();

  return (
    <select
      className={`env-switcher env-switcher-${active}`}
      value={active}
      onChange={(e) => setActiveEnv(e.target.value)}
      title="Base de datos activa"
    >
      {Object.entries(ENVIRONMENTS).map(([key, env]) => (
        <option key={key} value={key}>
          {env.label}
        </option>
      ))}
    </select>
  );
}
