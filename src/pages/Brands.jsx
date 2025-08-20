// BrandsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

function getBrandsApiUrl() {
  return (import.meta.env.VITE_API_URL || "") + "/brands";
}

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(getBrandsApiUrl())
      .then(res => res.json())
      .then(data => setBrands(Array.isArray(data) ? data : []));
  }, []);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {brands.map((brand) => (
            <button
              key={brand}
              className="border border-neutral-300 rounded-xl p-4 hover:bg-neutral-100 text-lg font-semibold text-center transition"
              onClick={() => navigate(`/?category=brands&brand=${encodeURIComponent(brand)}`)}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      <Footer />
    </>
  );
}
