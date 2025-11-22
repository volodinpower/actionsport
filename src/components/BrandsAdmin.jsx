import React, { useEffect, useMemo, useState } from "react";
import { fetchBrands, updateBrand, uploadBrandLogo } from "../api";

const API_BASE = import.meta.env.VITE_API_URL || "";

function makeImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

export default function BrandsAdmin() {
  const [brands, setBrands] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const selectedBrand = brands.find((b) => b.id === selectedId) || null;

  const loadBrands = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBrands();
      setBrands(Array.isArray(data) ? data : []);
      if (!selectedId && data?.length) {
        setSelectedId(data[0].id);
        setDescription(data[0].description || "");
      } else if (selectedId) {
        const updated = data.find((b) => b.id === selectedId);
        if (updated) {
          setDescription(updated.description || "");
        }
      }
    } catch (err) {
      setError(err.message || "Не удалось загрузить бренды");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      setDescription(selectedBrand.description || "");
    } else {
      setDescription("");
    }
  }, [selectedBrand?.id]);

  const filteredBrands = useMemo(() => {
    if (!search) return brands;
    const term = search.toLowerCase();
    return brands.filter((b) => (b.name || "").toLowerCase().includes(term));
  }, [brands, search]);

  async function handleSave() {
    if (!selectedBrand) return;
    setSaving(true);
    setError("");
    try {
      await updateBrand(selectedBrand.id, { description });
      await loadBrands();
    } catch (err) {
      setError(err.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e) {
    if (!selectedBrand) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await uploadBrandLogo(selectedBrand.id, file);
      await loadBrands();
    } catch (err) {
      setError(err.message || "Не удалось загрузить логотип");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
      <div
        style={{
          width: 280,
          border: "1px solid #e4e4e4",
          borderRadius: 12,
          padding: 12,
          maxHeight: "80vh",
          overflowY: "auto",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск бренда"
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={loadBrands}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#111",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↻
          </button>
        </div>
        {loading && <p style={{ fontSize: 12, color: "#666" }}>Загружаем...</p>}
        {filteredBrands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => setSelectedId(brand.id)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: brand.id === selectedId ? "#111" : "transparent",
              color: brand.id === selectedId ? "#fff" : "#333",
              borderRadius: 10,
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: brand.id === selectedId ? 700 : 500,
              marginBottom: 6,
            }}
          >
            {brand.name}
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          border: "1px solid #e4e4e4",
          borderRadius: 12,
          padding: 20,
          background: "#fff",
        }}
      >
        {selectedBrand ? (
          <>
            <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 24 }}>
              {selectedBrand.image_url ? (
                <img
                  src={makeImageUrl(selectedBrand.image_url)}
                  alt={selectedBrand.name}
                  style={{ width: 140, height: 140, objectFit: "contain", background: "#fafafa", borderRadius: 16, padding: 12 }}
                />
              ) : (
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 16,
                    border: "1px dashed #bbb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#aaa",
                    textTransform: "uppercase",
                    fontSize: 12,
                  }}
                >
                  нет логотипа
                </div>
              )}
              <div>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    background: "#111",
                    color: "#fff",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {uploading ? "Загружаем..." : "Загрузить логотип"}
                  <input type="file" accept="image/*" hidden onChange={handleLogoUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#777" }}>Название</label>
              <input
                value={selectedBrand.name}
                disabled
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#f8f8f8",
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#777" }}>Описание бренда</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  marginTop: 4,
                  resize: "vertical",
                  minHeight: 180,
                }}
              />
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "12px 24px",
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  fontWeight: 600,
                  cursor: "pointer",
                  minWidth: 140,
                }}
              >
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
              {error && <span style={{ color: "#d00", fontSize: 13 }}>{error}</span>}
            </div>
          </>
        ) : (
          <p>Выберите бренд слева, чтобы редактировать описание и логотип.</p>
        )}
      </div>
    </div>
  );
}
