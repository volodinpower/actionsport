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

  const handleBrandClick = (brand) => {
    // Навигация на каталог товаров выбранного бренда
    navigate(`/?category=brands&brand=${encodeURIComponent(brand)}`);
  };

  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl py-6 px-4">
        <h1 className="text-2xl font-bold mb-6 text-center">All Brands</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {brands.map((brand) => (
            <button
              key={brand}
              className="border border-neutral-300 rounded-xl p-4 hover:bg-neutral-100 text-lg font-semibold text-center transition"
              onClick={() => handleBrandClick(brand)}
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
