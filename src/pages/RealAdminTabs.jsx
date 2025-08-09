import React, { useEffect, useState } from "react";
import RealAdmin from "../pages/RealAdmin";          // проверь путь
import BannerAdmin from "../components/BannerAdmin";  // проверь путь
import { logout } from "../api";
import { useNavigate } from "react-router-dom";

export default function RealAdminTabs() {
  const [activeTab, setActiveTab] = useState("products");
  const navigate = useNavigate();

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

  async function handleLogout() {
    try { await logout(); } finally {
      navigate("/admin", { replace: true });
    }
  }

  return (
    <div style={{ width:"100vw", minHeight:"100vh", padding:20, background:"#fafbfc", boxSizing:"border-box" }}>
      <nav style={{ marginBottom:20, display:"flex", gap:20, alignItems:"center" }}>
        <button onClick={() => setActiveTab("products")}
                style={{ padding:"8px 16px", border:"none", background:"none",
                         borderBottom: activeTab==="products" ? "3px solid #111" : "none",
                         fontWeight: activeTab==="products" ? "bold" : "normal" }}>
          Товары и картинки
        </button>
        <button onClick={() => setActiveTab("banners")}
                style={{ padding:"8px 16px", border:"none", background:"none",
                         borderBottom: activeTab==="banners" ? "3px solid #111" : "none",
                         fontWeight: activeTab==="banners" ? "bold" : "normal" }}>
          Баннеры
        </button>
        <button onClick={handleLogout}
                style={{ marginLeft:"auto", padding:"8px 16px", background:"#eee", border:"1px solid #ccc",
                         borderRadius:6, fontWeight:"bold", color:"#d00" }}>
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
