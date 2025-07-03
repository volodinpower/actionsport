import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProductById, incrementProductView } from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";

function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}

function makeImageUrl(url) {
  if (!url) return "/no-image.jpg";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return apiUrl(url);
  return url;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function sortColorVariants(a, b) {
  return (a.color || "").localeCompare(b.color || "", undefined, { sensitivity: "base" });
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [mainIndex, setMainIndex] = useState(0);
  const [modalIndex, setModalIndex] = useState(0);
  const [colorVariants, setColorVariants] = useState([]);
  const [selectedColorId, setSelectedColorId] = useState(null);

  useEffect(() => {
    fetchProductById(id)
      .then((data) => {
        setProduct(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Ошибка загрузки товара");
        setProduct(null);
      });
  }, [id]);

  useEffect(() => {
    if (id) incrementProductView(id);
  }, [id]);

  useEffect(() => {
    if (!product || !Array.isArray(product.all_colors)) {
      setColorVariants([]);
      return;
    }
    const variants = [...product.all_colors].sort(sortColorVariants);
    setColorVariants(variants);
  }, [product]);

  useEffect(() => {
    if (location.state && location.state.color) {
      const found = product?.all_colors?.find(
        (c) =>
          c.color === location.state.color || String(c.id) === String(location.state.color)
      );
      if (found) {
        setSelectedColorId(found.id);
      } else if (product?.id) {
        setSelectedColorId(product.id);
      }
    } else if (product?.id) {
      setSelectedColorId(product.id);
    }
  }, [product, location.state]);

  let rawImages = [];
  if (typeof product?.image_url === "string" && product.image_url.trim()) {
    const urls = product.image_url
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    const numbered = urls.filter((url) => /_\d+\./.test(url));
    rawImages =
      numbered.length > 0
        ? numbered
        : urls.filter((u) => /_(main|prev)\./i.test(u));
    if (rawImages.length === 0) rawImages = urls;
    rawImages = rawImages.map(makeImageUrl);
  }
  if (rawImages.length === 0) rawImages = ["/no-image.jpg"];

  useEffect(() => {
    setMainIndex(0);
  }, [id, product?.image_url]);

  const displayName = product?.sitename || product?.name || "";

  const breadcrumbs = [
    { label: "Main", query: "" },
    { label: displayName, query: "" },
  ];

  const handleHeaderSearch = (query) => {
    navigate(query ? "/?search=" + encodeURIComponent(query) : "/");
  };

  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    const params = new URLSearchParams();
    if (catKey) params.set("category", catKey);
    if (subKey) params.set("subcategory", subKey);
    navigate({ pathname: "/", search: params.toString() });
  };

  const handleGoBack = () => {
    if (location.state?.from && location.state.from !== "/") {
      navigate(location.state.from);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  function renderPrice() {
    const price = Number(product.price);
    const discount = Number(product.discount);
    let discountPrice = Number(product.discount_price);
    if (discount > 0 && (!discountPrice || discountPrice === 0)) {
      discountPrice = Math.round(price * (1 - discount / 100));
    }
    return discount > 0 && discountPrice > 0 ? (
      <div>
        <div>
          <span style={{ textDecoration: "line-through", color: "#888", fontSize: "1.25rem", marginRight: "0.5rem" }}>
            {price.toLocaleString()} AMD
          </span>
          <span style={{ color: "red", fontWeight: "600", fontSize: "1.25rem" }}>
            -{discount}%
          </span>
        </div>
        <div>
          <span style={{ color: "green", fontWeight: "700", fontSize: "1.5rem" }}>
            {discountPrice.toLocaleString()} AMD
          </span>
        </div>
      </div>
    ) : (
      <span style={{ fontWeight: "700", fontSize: "1.5rem" }}>{price.toLocaleString()} AMD</span>
    );
  }

  if (error)
    return (
      <div style={{ padding: 32, textAlign: "center", color: "red" }}>Ошибка: {error}</div>
    );
  if (!product) return <div style={{ padding: 32, textAlign: "center" }}>Loading...</div>;

  const colorBlock =
    colorVariants.length <= 1 ? (
      <div style={{ marginBottom: 4, color: "#666", fontSize: 14 }}>
        <b>color:</b> {product.color}
      </div>
    ) : (
      <div style={{ marginBottom: 4, color: "#666", fontSize: 14, gap: 10 }}>
        <b>color:</b> {product.color}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 10,
            marginBottom: 10,
            maxWidth: 6 * 70,
          }}
        >
          {colorVariants.map((item) => {
            const mainImg = item.image_url
              ?.split(",")
              .map((u) => u.trim())
              .find((u) => u.toLowerCase().includes("_main"));
            const imgSrc = mainImg ? apiUrl(mainImg) : "/no-image.jpg";
            const isCurrent = String(item.id) === String(selectedColorId);
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 75,
                }}
              >
                <a
                  href={isCurrent ? undefined : `/product/${item.id}`}
                  tabIndex={isCurrent ? -1 : 0}
                  style={{
                    pointerEvents: isCurrent ? "none" : "auto",
                    borderRadius: 0,
                    border: isCurrent ? "3px solid red" : "2px solid #eee",
                    boxShadow: isCurrent
                      ? "0 0 0 4px rgba(255, 0, 0, 0.4)"
                      : "0 1px 8px #0002",
                    background: isCurrent ? "#ffe7e7" : "#fafbfc",
                    outline: "none",
                    width: 65,
                    height: 65,
                  }}
                  title={item.color || ""}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isCurrent) {
                      setSelectedColorId(item.id);
                      navigate(`/product/${item.id}`, {
                        replace: true,
                        state: {
                          from: location.state?.from || "/",
                          color: item.color,
                        },
                      });
                    }
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={item.color || displayName}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: "cover",
                      opacity: isCurrent ? 1 : 0.82,
                      borderRadius: 0, // убрали скругление
                    }}
                    draggable={false}
                  />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );

  const sizeBlock = (
    <div style={{ marginBottom: 4, color: "#666", fontSize: 14 }}>
      <b>size:</b>{" "}
      {Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes.join(", ")
        : "—"}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      <Header
        onSearch={handleHeaderSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={breadcrumbs}
        isHome={false}
      />
      <div style={{ width: "100%", margin: "auto", paddingTop: 8 }}>
        <Breadcrumbs
          items={breadcrumbs}
          onBreadcrumbClick={(idx) => {
            if (idx === 0) handleGoBack();
          }}
        />
        <div
          style={{
            backgroundColor: "white",
            boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
            padding: 24,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 32,
            marginTop: 8,
            width: "100%",
            maxWidth: 1200,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              flex: 1,
              minWidth: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isMobile ? (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 280,
                }}
              >
                {rawImages.length > 1 && (
                  <button
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(0,0,0,0.2)",
                      color: "white",
                      padding: "6px 10px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 20,
                      userSelect: "none",
                    }}
                    onClick={() =>
                      setMainIndex((mainIndex - 1 + rawImages.length) % rawImages.length)
                    }
                  >
                    ‹
                  </button>
                )}
                <img
                  src={rawImages[mainIndex]}
                  alt={displayName}
                  style={{
                    width: "100%",
                    maxHeight: 340,
                    objectFit: "contain",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.2)",
                    marginBottom: 12,
                    cursor: "pointer",
                    userSelect: "none",
                    borderRadius: 0, // убрали скругления
                  }}
                  onClick={() => {
                    setShowModal(true);
                    setModalIndex(mainIndex);
                  }}
                  draggable={false}
                />
                {rawImages.length > 1 && (
                  <button
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(0,0,0,0.2)",
                      color: "white",
                      padding: "6px 10px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 20,
                      userSelect: "none",
                    }}
                    onClick={() =>
                      setMainIndex((mainIndex + 1) % rawImages.length)
                    }
                  >
                    ›
                  </button>
                )}
              </div>
            ) : (
              <>
                <img
                  src={rawImages[mainIndex]}
                  alt={displayName}
                  style={{
                    width: "75%",
                    objectFit: "contain",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.2)",
                    marginBottom: 12,
                    cursor: "pointer",
                    borderRadius: 0, // убрали скругления
                  }}
                  onClick={() => {
                    setShowModal(true);
                    setModalIndex(mainIndex);
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 8,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {rawImages.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`Фото ${idx + 1}`}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: "cover",
                        cursor: "pointer",
                        borderRadius: 0, // убрали скругления
                        border: idx === mainIndex ? "2px solid black" : "2px solid #ddd",
                      }}
                      onClick={() => setMainIndex(idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", marginTop: isMobile ? 16 : 0 }}>
            <h2 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: 24 }}>{displayName}</h2>
            {colorBlock}
            {sizeBlock}
            <div style={{ marginTop: 32, marginBottom: 8 }}>{renderPrice()}</div>
            <button
              style={{
                marginTop: 32,
                padding: "10px 20px",
                backgroundColor: "black",
                color: "white",
                maxWidth: 160,
                border: "none",
                cursor: "pointer",
              }}
              onClick={handleGoBack}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {showModal && rawImages.length > 0 && (
        <div
          style={{
            position: "fixed",
            zIndex: 50,
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            style={{
              position: "absolute",
              top: 16,
              right: 24,
              color: "white",
              fontSize: 32,
              fontWeight: "700",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => setShowModal(false)}
          >
            ×
          </button>
          {rawImages.length > 1 && (
            <button
              style={{
                position: "absolute",
                left: 24,
                top: "50%",
                transform: "translateY(-50%)",
                color: "white",
                fontSize: 32,
                fontWeight: "700",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() =>
                setModalIndex((modalIndex - 1 + rawImages.length) % rawImages.length)
              }
            >
              ‹
            </button>
          )}
          <img
            src={rawImages[modalIndex]}
            alt={`${displayName} фото ${modalIndex + 1}`}
            style={{
              maxHeight: "80vh",
              maxWidth: "80vw",
              boxShadow: "0 1px 6px rgba(0,0,0,0.3)",
              borderRadius: 0, // убрали скругления
            }}
          />
          {rawImages.length > 1 && (
            <button
              style={{
                position: "absolute",
                right: 24,
                top: "50%",
                transform: "translateY(-50%)",
                color: "white",
                fontSize: 32,
                fontWeight: "700",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() =>
                setModalIndex((modalIndex + 1) % rawImages.length)
              }
            >
              ›
            </button>
          )}
          {!isMobile && rawImages.length > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: 32,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: 8,
              }}
            >
              {rawImages.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={`миниатюра ${idx + 1}`}
                  style={{
                    width: 48,
                    height: 48,
                    border: idx === modalIndex ? "2px solid white" : "2px solid transparent",
                    cursor: "pointer",
                    borderRadius: 0, // убрали скругления
                  }}
                  onClick={() => setModalIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}
