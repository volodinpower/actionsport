import React, { useEffect, useState } from "react";
import RealAdmin from "./RealAdmin";
import BannerAdmin from "../components/BannerAdmin";
import { logout, getMe } from "../api";

export default function RealAdminTabs() {
  const [activeTab, setActiveTab] = useState("products"); // 'products' | 'banners'
  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getMe();
        if (!cancelled) setMe(u);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    try { await logout(); } finally {
      window.location.href = "/admin";
    }
  }

  return (
    <div
      style={{
        width: "100%",          // <-- было 100vw
        maxWidth: "1280px",     // необязательно, но приятно для вёрстки
        margin: "0 auto",       // центрируем контент
        minHeight: "100vh",
        padding: 20,
        overflowY: "auto",      // <-- вместо overflow: hidden
        background: "#fafbfc",
        boxSizing: "border-box",
      }}
    >
      <nav style={{ marginBottom: 20, display: "flex", gap: 20, alignItems: "center" }}>
        <button
          onClick={() => setActiveTab("products")}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            borderBottom: activeTab === "products" ? "3px solid #111" : "none",
            fontWeight: activeTab === "products" ? "bold" : "normal",
            background: "none",
            border: "none",
          }}
        >
          Товары и картинки
        </button>
        <button
          onClick={() => setActiveTab("banners")}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            borderBottom: activeTab === "banners" ? "3px solid #111" : "none",
            fontWeight: activeTab === "banners" ? "bold" : "normal",
            background: "none",
            border: "none",
          }}
        >
          Баннеры
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {me?.email && <span style={{ color: "#666", fontSize: 14 }}>{me.email}</span>}
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              background: "#eee",
              border: "1px solid #ccc",
              borderRadius: 6,
              fontWeight: "bold",
              color: "#d00",
            }}
          >
            Выйти
          </button>
        </div>
      </nav>

      <main>
        {activeTab === "products" && <RealAdmin />}
        {activeTab === "banners" && <BannerAdmin />}
      </main>
    </div>
  );
}
