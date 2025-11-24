import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../components/AuthProvider";
import { favoriteToProductCard } from "../utils/favorites";

export default function FavoritesPage() {
  const { favorites } = useAuth();
  const navigate = useNavigate();

  const favoriteCards = useMemo(() => {
    return favorites
      .map((fav) => ({ fav, product: favoriteToProductCard(fav) }))
      .filter((item) => item.product);
  }, [favorites]);

  const handleSearch = (query = "") => {
    if (query) {
      navigate(`/?search=${encodeURIComponent(query)}`);
    } else {
      navigate("/");
    }
  };

  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    if (catKey === "brands" && subKey) {
      navigate(`/?category=brands&brand=${subKey}`);
    } else if (catKey === "brands") {
      navigate("/brands");
    } else {
      navigate(`/?category=${catKey}${subKey ? `&subcategory=${subKey}` : ""}`);
    }
  };

  const handleCardClick = (productId) => {
    if (!productId) return;
    navigate(`/product/${productId}`);
  };

  const breadcrumbs = [
    { label: "Main", query: "" },
    { label: "Account", query: "account" },
    { label: "Favorites", query: "" },
  ];

  const handleBreadcrumbClick = (idx) => {
    if (idx === 0) navigate("/");
    else if (idx === 1) navigate("/account");
  };

  return (
    <>
      <Header
        onSearch={handleSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        navigate={navigate}
        isHome={false}
      />
      <Breadcrumbs items={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />
      <main className="mx-auto px-2 pb-12 max-w-screen-2xl">
        {favoriteCards.length === 0 ? (
          <p className="text-gray-500">You haven't added any favorites yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-2">
            {favoriteCards.map(({ fav, product }) => (
              <div key={fav.id || `${fav.product_name}-${fav.product_color}`}>
                <ProductCard product={product} onClick={() => handleCardClick(product.id)} />
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
  const breadcrumbs = [
    { label: "Main", query: "" },
    { label: "Account", query: "account" },
    { label: "Favorites", query: "" },
  ];

  const handleBreadcrumbClick = (idx) => {
    if (idx === 0) {
      navigate("/");
    } else if (idx === 1) {
      navigate("/account");
    }
  };
