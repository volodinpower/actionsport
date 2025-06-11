import React, { useEffect, useState } from "react";

export default function BannerAdmin() {
  const [banners, setBanners] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newFile, setNewFile] = useState(null);
  const [newLink, setNewLink] = useState("");
  const [newAlt, setNewAlt] = useState("");

  const loadBanners = () => {
    fetch("/banners")
      .then(res => res.json())
      .then(setBanners);
  };

  useEffect(loadBanners, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newFile) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", newFile);
    form.append("link", newLink);
    form.append("alt", newAlt);
    await fetch("/admin/upload_banner", {
      method: "POST",
      body: form
    });
    setNewFile(null); setNewLink(""); setNewAlt("");
    setUploading(false);
    loadBanners();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить баннер?")) return;
    const form = new FormData();
    form.append("banner_id", id);
    await fetch("/admin/delete_banner", {
      method: "POST",
      body: form
    });
    loadBanners();
  };

  return (
    <div style={{marginBottom: 30}}>
      <h3>Баннеры (Главная)</h3>
      <form onSubmit={handleUpload} style={{marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center'}}>
        <input type="file" accept="image/*" required onChange={e => setNewFile(e.target.files[0])} />
        <input type="text" placeholder="Ссылка (необязательно)" value={newLink} onChange={e => setNewLink(e.target.value)} />
        <input type="text" placeholder="Alt (описание)" value={newAlt} onChange={e => setNewAlt(e.target.value)} />
        <button type="submit" disabled={uploading}>Загрузить</button>
      </form>
      <div style={{display: 'flex', gap: 16, flexWrap: 'wrap'}}>
        {banners.map(b => (
          <div key={b.id} style={{border: '1px solid #ccc', borderRadius: 6, padding: 8, minWidth: 280}}>
            <img src={b.image_url} alt={b.alt || ""} style={{width: 250, maxHeight: 120, objectFit: 'cover', borderRadius: 4, marginBottom: 8}} />
            <div style={{fontSize: 13}}>Alt: {b.alt || "—"}</div>
            <div style={{fontSize: 13, wordBreak: 'break-all'}}>Link: {b.link || "—"}</div>
            <button style={{color: '#c00', marginTop: 8}} onClick={() => handleDelete(b.id)}>Удалить</button>
          </div>
        ))}
      </div>
    </div>
  );
}
