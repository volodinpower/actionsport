// src/admin/BannerAdmin.jsx
import React, { useEffect, useState } from "react";
import { fetchBanners, uploadBanner, deleteBanner } from "../api";

const BASE = import.meta.env.VITE_API_URL || "";

function imgUrl(url) {
  if (!url) return "/no-image.jpg";
  if (url.startsWith("http")) return url;
  return BASE + (url.startsWith("/") ? url : "/" + url);
}

export default function BannerAdmin() {
  const [banners, setBanners] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");
      const data = await fetchBanners(); // GET /banners (credentials: include)
      setBanners(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Не удалось загрузить баннеры");
    }
  }

  useEffect(() => { load(); }, []);

  async function onUpload(e) {
    e.preventDefault();
    if (!file) { setErr("Выберите файл"); return; }
    setUploading(true);
    setErr("");
    try {
      // POST /admin/banner/upload (credentials: include)
      await uploadBanner(file, link, alt); // title опционален; если нужно — добавь 4-й аргумент и ручку на бэке
      setFile(null);
      setLink("");
      setTitle("");
      setAlt("");
      await load();
    } catch (e) {
      setErr(e?.message || "Ошибка загрузки баннера");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Удалить баннер?")) return;
    setUploading(true);
    setErr("");
    try {
      // POST /admin/banner/delete (credentials: include)
      await deleteBanner(id);
      await load();
    } catch (e) {
      setErr(e?.message || "Ошибка удаления баннера");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginBottom: 30 }}>
      <h3>Баннеры (Главная)</h3>

      <form onSubmit={onUpload} style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="file" accept="image/*" required onChange={e => setFile(e.target.files?.[0] || null)} disabled={uploading} />
        <input type="text" placeholder="Ссылка (необязательно)" value={link} onChange={e => setLink(e.target.value)} disabled={uploading} />
        <input type="text" placeholder="Заголовок (опц.)" value={title} onChange={e => setTitle(e.target.value)} disabled={uploading} />
        <input type="text" placeholder="Alt (описание)" value={alt} onChange={e => setAlt(e.target.value)} disabled={uploading} />
        <button type="submit" disabled={uploading} style={{ background:"#111", color:"#fff", padding:"8px 12px", borderRadius:8 }}>
          {uploading ? "Загружаю…" : "Добавить баннер"}
        </button>
      </form>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {banners.length === 0 && <p style={{ color: "#888" }}>Нет баннеров</p>}
        {banners.map(b => (
          <div key={b.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, minWidth: 280 }}>
            <img
              src={imgUrl(b.image_url)}
              alt={b.alt || ""}
              style={{ width: 250, maxHeight: 120, objectFit: "cover", borderRadius: 6, marginBottom: 8 }}
            />
            <div style={{ fontSize: 13, color: "#333" }}>id: {b.id}</div>
            <div style={{ fontSize: 13, color: "#333" }}>alt: {b.alt || "—"}</div>
            <div style={{ fontSize: 13, color: "#333", wordBreak: "break-all" }}>link: {b.link || "—"}</div>
            <button
              onClick={() => onDelete(b.id)}
              disabled={uploading}
              style={{ color: "#fff", background: "#b91c1c", borderRadius: 8, padding: "6px 10px", marginTop: 8 }}
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
