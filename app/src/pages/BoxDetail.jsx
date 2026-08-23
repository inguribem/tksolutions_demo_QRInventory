import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { supabase } from "../lib/supabaseClient.js";
import { fetchLocations, createLocation, splitLocationId, locationPath } from "../lib/locations.js";
import Badge from "../components/Badge.jsx";
import Modal from "../components/Modal.jsx";

const STATUS_OPTIONS = [
  "stored",
  "partially_empty",
  "borrowed",
  "needs_organization",
  "empty",
  "archived",
];

const PHOTO_BUCKET = "inventory";

export default function BoxDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [items, setItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keywordsText, setKeywordsText] = useState("");
  const [parentLocationId, setParentLocationId] = useState("");
  const [childLocationId, setChildLocationId] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const [newChildLocationName, setNewChildLocationName] = useState("");
  const [addingChildLocation, setAddingChildLocation] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [itemModal, setItemModal] = useState(null); // null | "create" | item
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    quantity: 1,
    unit: "",
    category_id: "",
  });
  const [itemSaving, setItemSaving] = useState(false);

  async function loadItems() {
    const { data } = await supabase
      .from("items")
      .select("id, name, description, quantity, unit, category_id, categories(name)")
      .eq("box_id", id)
      .order("created_at", { ascending: false });
    setItems(data || []);
  }

  async function loadPhotos() {
    const { data } = await supabase
      .from("photos")
      .select("id, storage_path, caption, created_at")
      .eq("box_id", id)
      .order("created_at", { ascending: false });

    const withUrls = await Promise.all(
      (data || []).map(async (photo) => {
        const { data: signed } = await supabase.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(photo.storage_path, 3600);
        return { ...photo, url: signed?.signedUrl };
      })
    );

    setPhotos(withUrls);
  }

  async function load() {
    const { data: boxData, error: boxError } = await supabase
      .from("boxes")
      .select("*, locations(name)")
      .eq("id", id)
      .single();

    if (boxError) {
      setError(boxError.message);
      return;
    }

    setBox(boxData);
    setKeywordsText((boxData.keywords || []).join(", "));

    const locationsList = await fetchLocations();
    setLocations(locationsList);
    const { parentId, childId } = splitLocationId(boxData.location_id, locationsList);
    setParentLocationId(parentId);
    setChildLocationId(childId);

    await loadItems();
    await loadPhotos();

    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    setCategories(categoriesData || []);

    const url = await QRCode.toDataURL(boxData.qr_token, { width: 220, margin: 1 });
    setQrDataUrl(url);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const keywords = keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const { error: updateError } = await supabase
      .from("boxes")
      .update({
        name: box.name,
        description: box.description,
        status: box.status,
        notes: box.notes,
        location_id: childLocationId || parentLocationId || null,
        keywords,
      })
      .eq("id", id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    load();
  }

  function handleParentLocationChange(value) {
    setParentLocationId(value);
    setChildLocationId("");
  }

  async function handleAddLocation() {
    if (!newLocationName.trim()) return;
    setAddingLocation(true);
    try {
      const loc = await createLocation(newLocationName.trim());
      setLocations((prev) => [...prev, loc]);
      setParentLocationId(loc.id);
      setChildLocationId("");
      setNewLocationName("");
    } catch (err) {
      setError(err.message);
    }
    setAddingLocation(false);
  }

  async function handleAddChildLocation() {
    if (!newChildLocationName.trim() || !parentLocationId) return;
    setAddingChildLocation(true);
    try {
      const loc = await createLocation(newChildLocationName.trim(), parentLocationId);
      setLocations((prev) => [...prev, loc]);
      setChildLocationId(loc.id);
      setNewChildLocationName("");
    } catch (err) {
      setError(err.message);
    }
    setAddingChildLocation(false);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = `${user.id}/${id}/${crypto.randomUUID()}-${file.name}`;

    const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("photos").insert({
      user_id: user.id,
      box_id: id,
      storage_bucket: PHOTO_BUCKET,
      storage_path: path,
      original_filename: file.name,
      mime_type: file.type,
      file_size: file.size,
    });

    setUploading(false);
    e.target.value = "";

    if (insertError) {
      setError(insertError.message);
      return;
    }

    loadPhotos();
  }

  function openCreateItem() {
    setItemForm({ name: "", description: "", quantity: 1, unit: "", category_id: "" });
    setItemModal("create");
  }

  function openEditItem(item) {
    setItemForm({
      name: item.name,
      description: item.description || "",
      quantity: item.quantity ?? 1,
      unit: item.unit || "",
      category_id: item.category_id || "",
    });
    setItemModal(item);
  }

  async function handleItemSubmit(e) {
    e.preventDefault();
    setItemSaving(true);
    setError("");

    const payload = {
      name: itemForm.name,
      description: itemForm.description || null,
      quantity: itemForm.quantity,
      unit: itemForm.unit || null,
      category_id: itemForm.category_id || null,
    };

    let submitError;
    if (itemModal === "create") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("items")
        .insert({ ...payload, user_id: user.id, box_id: id });
      submitError = error;
    } else {
      const { error } = await supabase.from("items").update(payload).eq("id", itemModal.id);
      submitError = error;
    }

    setItemSaving(false);

    if (submitError) {
      setError(submitError.message);
      return;
    }

    setItemModal(null);
    loadItems();
  }

  async function handleDeleteItem(item) {
    if (!confirm(`¿Borrar "${item.name}" del contenido de la caja?`)) return;
    const { error: deleteError } = await supabase.from("items").delete().eq("id", item.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    loadItems();
  }

  async function handleDelete() {
    if (!confirm(`¿Borrar la caja ${box.box_code}? Esta acción no se puede deshacer.`)) return;
    const { error: deleteError } = await supabase.from("boxes").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    navigate("/cajas");
  }

  if (error && !box) return <div className="error-banner">{error}</div>;
  if (!box) return <p className="empty-state">Cargando...</p>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="mono">{box.box_code}</h1>
          <p className="page-subtitle">
            <Badge status={box.status} /> · {locationPath(box.location_id, locations) || "Sin ubicación"}
          </p>
        </div>
        <button className="link-button danger" onClick={handleDelete}>
          Borrar caja
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20 }}>
        <div className="card">
          <h2 className="card-title">Detalle</h2>
          <form className="form" onSubmit={handleSave}>
            <label>
              Nombre
              <input
                value={box.name}
                onChange={(e) => setBox({ ...box, name: e.target.value })}
              />
            </label>
            <label>
              Descripción
              <input
                value={box.description || ""}
                onChange={(e) => setBox({ ...box, description: e.target.value })}
              />
            </label>
            <label>
              Estado
              <select
                value={box.status}
                onChange={(e) => setBox({ ...box, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ubicación
              <select
                value={parentLocationId}
                onChange={(e) => handleParentLocationChange(e.target.value)}
              >
                <option value="">Sin ubicación</option>
                {locations
                  .filter((l) => !l.parent_location_id)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="inline-form">
              <input
                placeholder="Nueva ubicación (ej. Garage, Clóset de ropa blanca)"
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

            {parentLocationId && (
              <>
                <label>
                  Sub-ubicación
                  <select
                    value={childLocationId}
                    onChange={(e) => setChildLocationId(e.target.value)}
                  >
                    <option value="">Sin sub-ubicación</option>
                    {locations
                      .filter((l) => l.parent_location_id === parentLocationId)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="inline-form">
                  <input
                    placeholder="Nueva sub-ubicación (ej. Estante 1)"
                    value={newChildLocationName}
                    onChange={(e) => setNewChildLocationName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleAddChildLocation}
                    disabled={addingChildLocation || !newChildLocationName.trim()}
                  >
                    {addingChildLocation ? "Agregando..." : "+ Agregar"}
                  </button>
                </div>
              </>
            )}

            <label>
              Keywords
              <input
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="Separadas por coma, ej. navidad, luces, adornos"
              />
            </label>
            <label>
              Notas
              <input
                value={box.notes || ""}
                onChange={(e) => setBox({ ...box, notes: e.target.value })}
              />
            </label>
            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <h2 className="card-title">Código QR</h2>
          {qrDataUrl && <img src={qrDataUrl} alt={`QR de ${box.box_code}`} width={220} />}
          <p className="stat-card-hint mono" style={{ wordBreak: "break-all", marginTop: 12 }}>
            {box.qr_token}
          </p>
        </div>
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            Fotos ({photos.length})
          </h2>
          <label className="btn-secondary upload-label">
            {uploading ? "Subiendo..." : "+ Subir foto"}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        </div>
        {photos.length === 0 ? (
          <p className="empty-state">Todavía no hay fotos de esta caja.</p>
        ) : (
          <div className="photo-grid">
            {photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt={photo.caption || box.name}
                className="photo-thumb"
              />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            Contenido ({items.length})
          </h2>
          <button className="btn-secondary" onClick={openCreateItem}>
            + Agregar item
          </button>
        </div>
        {items.length === 0 ? (
          <p className="empty-state">No hay objetos catalogados en esta caja.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cantidad</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>
                    {item.quantity} {item.unit || ""}
                  </td>
                  <td>{item.categories?.name || "—"}</td>
                  <td>{item.description || "—"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="link-button" onClick={() => openEditItem(item)}>
                        Editar
                      </button>
                      <button
                        className="link-button danger"
                        onClick={() => handleDeleteItem(item)}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {itemModal && (
        <Modal
          title={itemModal === "create" ? "Nuevo item" : "Editar item"}
          onClose={() => setItemModal(null)}
        >
          <form className="form" onSubmit={handleItemSubmit}>
            {error && <div className="error-banner">{error}</div>}
            <label>
              Nombre
              <input
                required
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="Ej. Foco LED"
              />
            </label>
            <label>
              Descripción
              <input
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Opcional"
              />
            </label>
            <label>
              Categoría
              <select
                value={itemForm.category_id}
                onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
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
              Cantidad
              <input
                type="number"
                min="0"
                step="0.01"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
              />
            </label>
            <label>
              Unidad
              <input
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="Opcional, ej. cajas, pares, kg"
              />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setItemModal(null)}>
                Cancelar
              </button>
              <button className="btn-primary" type="submit" disabled={itemSaving}>
                {itemSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
