import { createClient } from "@supabase/supabase-js";

const STORAGE_KEY = "qrinv-supabase-env";

export const ENVIRONMENTS = {
  local: {
    label: "Local",
    url: import.meta.env.VITE_SUPABASE_URL_LOCAL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_LOCAL,
  },
  cloud: {
    label: "Supabase Cloud",
    url: import.meta.env.VITE_SUPABASE_URL_CLOUD,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY_CLOUD,
  },
};

export function getActiveEnv() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && ENVIRONMENTS[stored] ? stored : "local";
}

export function setActiveEnv(env) {
  if (!ENVIRONMENTS[env] || env === getActiveEnv()) return;
  localStorage.setItem(STORAGE_KEY, env);
  window.location.reload();
}

const activeEnv = getActiveEnv();
const config = ENVIRONMENTS[activeEnv];

export const supabase = createClient(config.url, config.anonKey, {
  auth: {
    // Cada ambiente guarda su propia sesión (no se pisan entre sí al cambiar).
    storageKey: `sb-${activeEnv}-auth-token`,
  },
});
