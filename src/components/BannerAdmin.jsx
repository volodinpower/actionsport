import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getImageUrl(url) {
  if (!url) return "/no-image.jpg";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL || "";
  return base + (url.startsWith("/") ? url : "/" + url);
}

export default function BannerAdmin() {
  const [banners, setBanners] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newFile, setNewFile] = useState(null);
  const [newLink, setNewLink] = useState("");
  const [newAlt, setNewAlt] = useState("");

  const loadBanners = () => {
    fetch(API_BASE + "/banners")
      .then(res => {
        if (!res.ok) throw new Error("Ошибка загрузки баннеров");
        return res.json();
      })
      .then(setBanners)
      .catch(err => alert(err.message));
  };

  useEffect(loadBanners, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newFile) return alert("Выберите файл");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", newFile);
      form.append("link", newLink);
      form.append("alt", newAlt);

      const res = await fetch(API_BASE + "/admin/banner/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Ошибка загрузки баннера");
      await loadBanners();
      setNewFile(null);
      setNewLink("");
      setNewAlt("");
      alert("Баннер успешно загружен");
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить баннер?")) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("banner_id", id);

      const res = await fetch(API_BASE + "/admin/banner/delete", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Ошибка удаления баннера");
      await loadBanners();
      alert("Баннер удалён");
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: 30 }}>
      <h3>Баннеры (Главная)</h3>
      <form onSubmit={handleUpload} style={{ marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="file" accept="image/*" required onChange={e => setNewFile(e.target.files[0])} disabled={uploading} />
        <input type="text" placeholder="Ссылка (необязательно)" value={newLink} onChange={e => setNewLink(e.target.value)} disabled={uploading} />
        <input type="text" placeholder="Alt (описание)" value={newAlt} onChange={e => setNewAlt(e.target.value)} disabled={uploading} />
        <button type="submit" disabled={uploading}>Загрузить</button>
      </form>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {banners.length === 0 && <p style={{ color: "#888" }}>Нет баннеров</p>}
        {banners.map(b => (
          <div key={b.id} style={{ border: '1px solid #ccc', borderRadius: 6, padding: 8, minWidth: 280 }}>
            <img
              src={getImageUrl(b.image_url)}
              alt={b.alt || ""}
              style={{ width: 250, maxHeight: 120, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }}
            />
            <div style={{ fontSize: 13 }}>Alt: {b.alt || "—"}</div>
            <div style={{ fontSize: 13, wordBreak: 'break-all' }}>Link: {b.link || "—"}</div>
            <button style={{ color: '#c00', marginTop: 8 }} onClick={() => handleDelete(b.id)} disabled={uploading}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  );
}
