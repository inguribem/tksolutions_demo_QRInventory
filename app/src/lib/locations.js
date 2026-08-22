import { supabase } from "./supabaseClient.js";

export async function fetchLocations() {
  const { data, error } = await supabase.from("locations").select("id, name").order("name");
  if (error) throw error;
  return data || [];
}

export async function createLocation(name) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("locations")
    .insert({ user_id: user.id, name })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}
