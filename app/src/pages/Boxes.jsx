import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { fetchLocations, createLocation } from "../lib/locations.js";
import Badge from "../components/Badge.jsx";
import Modal from "../components/Modal.jsx";

const BOX_SELECT = "id, box_code, name, status, category_id, categories(name), locations(name)";

export default function Boxes() {
  const [boxes, setBoxes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    location_id: "",
    keywords: "",
  });
  const [newLocationName, setNewLocationName] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadBoxes(searchText = "") {
    setLoading(true);
    let request = supabase.from("boxes").select(BOX_SELECT).order("created_at", { ascending: false });

    if (searchText.trim()) {
      request = request.or(`name.ilike.%${searchText}%,box_code.ilike.%${searchText}%`);
    }

    const { data } = await request;
    setBoxes(data || []);
    setLoading(false);
  }

  async function loadLocations() {
    setLocations(await fetchLocations());
  }

  useEffect(() => {
    loadBoxes();
    loadLocations();
    supabase
      .from("categories")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCategories(data || []));
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    loadBoxes(query);
  }

  function handleClearSearch() {
    setQuery("");
    loadBoxes("");
  }

  async function handleAddLocation() {
    if (!newLocationName.trim()) return;
    setAddingLocation(true);
    try {
      const loc = await createLocation(newLocationName.trim());
      setLocations((prev) => [...prev, loc].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, location_id: loc.id }));
      setNewLocationName("");
    } catch (err) {
      setError(err.message);
    }
    setAddingLocation(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: boxCode, error: codeError } = await supabase.rpc("generate_box_code", {
      p_user_id: user.id,
    });

    if (codeError) {
      setError(codeError.message);
      setSaving(false);
      return;
    }

    const keywords = form.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const { error: insertError } = await supabase.from("boxes").insert({
      user_id: user.id,
      box_code: boxCode,
      name: form.name,
      description: form.description || null,
      category_id: form.category_id || null,
      location_id: form.location_id || null,
      keywords,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setShowCreate(false);
    setForm({ name: "", description: "", category_id: "", location_id: "", keywords: "" });
    loadBoxes(query);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Cajas</h1>
          <p className="page-subtitle">Todas las cajas registradas</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + Nueva caja
        </button>
      </div>

      <form className="filter-bar" onSubmit={handleSearch}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o código (ej. HOME-0001)"
        />
        <button className="btn-secondary" type="submit">
          Buscar
        </button>
        {query && (
          <button className="link-button" type="button" onClick={handleClearSearch}>
            Limpiar
          </button>
        )}
      </form>

      <div className="card">
        {loading ? (
          <p className="empty-state">Cargando...</p>
        ) : boxes.length === 0 ? (
          <p className="empty-state">
            {query ? "Ninguna caja coincide con la búsqueda." : "Todavía no hay cajas. Creá la primera."}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Ubicación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {boxes.map((box) => (
                <tr key={box.id}>
                  <td className="mono">
                    <Link to={`/cajas/${box.id}`}>{box.box_code}</Link>
                  </td>
                  <td>{box.name}</td>
                  <td>{box.categories?.name || "—"}</td>
                  <td>{box.locations?.name || "—"}</td>
                  <td>
                    <Badge status={box.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <Modal title="Nueva caja" onClose={() => setShowCreate(false)}>
          <form className="form" onSubmit={handleCreate}>
            {error && <div className="error-banner">{error}</div>}
            <label>
              Nombre
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Decoración navideña"
              />
            </label>
            <label>
              Descripción
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Opcional"
              />
            </label>
            <label>
              Categoría
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ubicación
              <select
                value={form.location_id}
                onChange={(e) => setForm({ ...form, location_id: e.target.value })}
              >
                <option value="">Sin ubicación</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-form">
              <input
                placeholder="Nueva ubicación (ej. Garage, Clóset)"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddLocation}
                disabled={addingLocation || !newLocationName.trim()}
              >
                {addingLocation ? "Agregando..." : "+ Agregar"}
              </button>
            </div>
            <label>
              keywords
              <input
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="Separadas por coma, ej. navidad, luces, adornos"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </button>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Creando..." : "Crear caja"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
