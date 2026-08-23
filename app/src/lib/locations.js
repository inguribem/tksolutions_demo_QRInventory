import { supabase } from "./supabaseClient.js";

export async function fetchLocations() {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, parent_location_id")
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function createLocation(name, parentLocationId = null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("locations")
    .insert({ user_id: user.id, name, parent_location_id: parentLocationId })
    .select("id, name, parent_location_id")
    .single();

  if (error) throw error;
  return data;
}

// Dado un location_id (nivel 1 o nivel 2) devuelve { parentId, childId }
// para precargar los dos selects en cascada.
export function splitLocationId(locationId, locations) {
  if (!locationId) return { parentId: "", childId: "" };
  const loc = locations.find((l) => l.id === locationId);
  if (!loc) return { parentId: "", childId: "" };
  return loc.parent_location_id
    ? { parentId: loc.parent_location_id, childId: loc.id }
    : { parentId: loc.id, childId: "" };
}

// Nombre completo "Padre > Hijo" (o solo el nombre si es de nivel 1),
// calculado a partir de la lista de ubicaciones ya cargada en memoria.
export function locationPath(locationId, locations) {
  if (!locationId) return null;
  const loc = locations.find((l) => l.id === locationId);
  if (!loc) return null;
  if (!loc.parent_location_id) return loc.name;
  const parent = locations.find((l) => l.id === loc.parent_location_id);
  return parent ? `${parent.name} > ${loc.name}` : loc.name;
}
