import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RealAdmin from "../pages/RealAdmin";
import BannerAdmin from "./BannerAdmin";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("products");
  const navigate = useNavigate();

  // Проверка токена при входе
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin");
    }
  }, [navigate]);

  // --- Авто-logout при уходе со страницы ---
  useEffect(() => {
    return () => {
      localStorage.removeItem("admin_token");
    };
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "auto" }}>
      <nav style={{ marginBottom: 20, display: "flex", gap: 20 }}>
        <button
          onClick={() => setActiveTab("products")}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            borderBottom: activeTab === "products" ? "3px solid #111" : "none",
            fontWeight: activeTab === "products" ? "bold" : "normal",
            background: "none",
            border: "none"
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
            border: "none"
          }}
        >
          Баннеры
        </button>
      </nav>

      <main>
        {activeTab === "products" && <RealAdmin />}
        {activeTab === "banners" && <BannerAdmin />}
      </main>
    </div>
  );
}
