// src/admin/AdminPanel.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RealAdmin from "../pages/RealAdmin";
import BannerAdmin from "./BannerAdmin";
import { logout } from "../api"; // cookie-based logout

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("products");
  const navigate = useNavigate();

  // косметика для body (как у тебя)
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.paddingRight = "0px";
    document.body.classList.remove("overflow-hidden");
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  const handleLogoutClick = async () => {
    try {
      await logout(); // серверная очистка cookie-сессии
    } finally {
      navigate("/admin", { replace: true });
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        margin: 0,
        padding: 20,
        overflow: "hidden",
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

        <button
          onClick={handleLogoutClick}
          style={{
            marginLeft: "auto",
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
      </nav>

      <main>
        {activeTab === "products" && <RealAdmin />}
        {activeTab === "banners" && <BannerAdmin />}
      </main>
    </div>
  );
}
