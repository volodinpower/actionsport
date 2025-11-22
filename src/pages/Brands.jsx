import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { fetchBrands } from "../api";

const API_BASE = import.meta.env.VITE_API_URL || "";

function makeImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchBrands().then((data) => setBrands(Array.isArray(data) ? data : [])).catch(() => setBrands([]));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return brands;
    const term = search.toLowerCase();
    return brands.filter((b) => (b.name || "").toLowerCase().includes(term));
  }, [brands, search]);

  // ✅ обработчик кликов по меню (такой же, как в Home.jsx)
  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    if (catKey === "brands" && subKey) {
      navigate(`/?category=brands&brand=${subKey}`);
    } else if (catKey === "brands") {
      navigate("/brands");
    } else {
      navigate(`/?category=${catKey}${subKey ? `&subcategory=${subKey}` : ""}`);
    }
  };

  const handleSearch = (query = "") => {
    navigate(`/?search=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <Header
        onSearch={handleSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        navigate={navigate}   // 👈 обязательно!
      />

      <div className="mx-auto max-w-5xl py-6 px-4">
        <h1 className="text-2xl font-bold mb-6 text-center">All Brands</h1>
        <div className="max-w-md mx-auto mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск бренда"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {filtered.map((brand) => (
            <button
              key={brand.id}
              className="border border-neutral-300 rounded-xl p-4 hover:bg-neutral-100 text-sm font-semibold text-center transition flex flex-col items-center gap-3"
              onClick={() => navigate(`/?category=brands&brand=${encodeURIComponent(brand.name)}`)}
            >
              {brand.image_url ? (
                <img
                  src={makeImageUrl(brand.image_url)}
                  alt={brand.name}
                  className="h-16 object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="h-16 flex items-center justify-center text-neutral-400 uppercase text-xs tracking-wide border border-dashed w-full rounded-md">
                  logo
                </div>
              )}
              <span className="text-base font-semibold">{brand.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-neutral-500 col-span-full">Бренды не найдены</p>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
